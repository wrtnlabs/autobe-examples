import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_attachments_create } from "../../../generate/generate_random_reddit_like_member_attachments_create";
import { prepare_random_reddit_like_attachment } from "../../../prepare/prepare_random_reddit_like_attachment";

export async function test_api_attachment_batch_cleanup_date_threshold_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner and member connections with authentication
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    nickname: RandomGenerator.name(),
  } satisfies IRedditLikeOwner.IJoin;
  await authorize_owner_join(ownerConnection, { body: ownerJoinBody });
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(1),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditLikeMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberJoinBody });
  // 2. Upload 5 attachments
  const attachments: IRedditLikeAttachment[] = await ArrayUtil.asyncRepeat(
    5,
    async () => {
      const attachment =
        await generate_random_reddit_like_member_attachments_create(
          memberConnection,
          {
            body: {
              fileUri: "https://example.com/test-image.jpg",
              originalFilename: "test-image.jpg",
            },
          },
        );
      return attachment;
    },
  );
  // 3. Soft-delete first 2 attachments (older deletions)
  const olderDeletedAttachments = attachments.slice(0, 2);
  await ArrayUtil.asyncForEach(olderDeletedAttachments, async (attachment) => {
    await api.functional.redditLike.member.attachments.erase(memberConnection, {
      attachmentId: attachment.id,
    });
  });
  // Wait briefly to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 100));
  // Record the cutoff time between the two deletion batches
  const cutoffTime = new Date().toISOString();
  // Wait briefly before deleting remaining attachments
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 4. Soft-delete remaining 3 attachments (newer deletions, after cutoff)
  const newerDeletedAttachments = attachments.slice(2);
  await ArrayUtil.asyncForEach(newerDeletedAttachments, async (attachment) => {
    await api.functional.redditLike.member.attachments.erase(memberConnection, {
      attachmentId: attachment.id,
    });
  });
  // 5. Execute batch cleanup with deletedBefore filter set to cutoff time
  // This should only clean up the 2 older soft-deleted attachments
  const cleanupResult: IRedditLikeAttachment.ICleanupResult =
    await api.functional.redditLike.owner.attachments.batch_cleanup.cleanup(
      ownerConnection,
      {
        body: {
          deletedBefore: cutoffTime,
          orphanedOnly: false,
          dryRun: false,
        } satisfies IRedditLikeAttachment.ICleanup,
      },
    );
  typia.assert(cleanupResult);
  // 6. Validate that only the older attachments were cleaned (cleanedCount should be 2)
  TestValidator.equals(
    "cleanedCount matches older deleted attachments",
    cleanupResult.cleanedCount,
    2,
  );
  TestValidator.predicate(
    "total bytes freed is non-negative",
    cleanupResult.totalBytesFreed >= 0,
  );
  TestValidator.equals("dryRun flag is false", cleanupResult.dryRun, false);
  TestValidator.equals(
    "no errors during cleanup",
    cleanupResult.errors.length,
    0,
  );
}
