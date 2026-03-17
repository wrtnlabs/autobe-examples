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

export async function test_api_attachment_batch_cleanup_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup owner connection
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  // 2. Setup member connection to upload attachments
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditLikeMember.IJoin,
  });
  // 3. Upload multiple attachments as member
  const attachments: IRedditLikeAttachment[] = [];
  const attachmentCount = 5;
  for (let i = 0; i < attachmentCount; i++) {
    const originalFilename = `test_${RandomGenerator.alphaNumeric(8)}.jpg`;
    const attachment =
      await generate_random_reddit_like_member_attachments_create(
        memberConnection,
        {
          body: {
            originalFilename: originalFilename,
            fileUri: `file://test/${originalFilename}`,
          } satisfies IRedditLikeAttachment.ICreate,
        },
      );
    typia.assert(attachment);
    attachments.push(attachment);
  }
  // Calculate expected bytes freed
  const expectedTotalBytes = attachments.reduce(
    (sum, a) => sum + a.fileSizeBytes,
    0,
  );
  // 4. Execute batch cleanup as owner with deletedBefore filter (current timestamp)
  const cleanupResult =
    await api.functional.redditLike.owner.attachments.batch_cleanup.cleanup(
      ownerConnection,
      {
        body: {
          deletedBefore: new Date().toISOString(),
          orphanedOnly: false,
          dryRun: false,
        } satisfies IRedditLikeAttachment.ICleanup,
      },
    );
  typia.assert(cleanupResult);
  // 5. Validate cleanup result matches expectations
  TestValidator.equals(
    "dryRun false indicates actual deletion",
    cleanupResult.dryRun,
    false,
  );
  TestValidator.equals("errors array empty", cleanupResult.errors.length, 0);
}
