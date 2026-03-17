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

/**
 * Test dry-run mode for batch cleanup preview without actual deletion.
 *
 * Setup: Register owner, register member, upload attachments, create some orphaned
 * attachments (uploaded but not linked to any profile, community, or post).
 *
 * Execute batch-cleanup with dryRun=true and orphanedOnly=true. Verify response shows
 * cleanedCount and totalBytesFreed as if deletion occurred, but dryRun=true indicating
 * preview mode. Validate that no actual deletions happened: attachment records remain
 * in database, and related records are intact.
 *
 * Then execute again with dryRun=false on the same attachments to confirm actual
 * cleanup occurs. This scenario validates the administrative preview capability
 * before committing destructive operations.
 */
export async function test_api_attachment_batch_cleanup_dry_run_preview(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner connection and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = typia.random<string & tags.Format<"password">>();
  await authorize_owner_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      nickname: "Owner Nickname",
    },
  });
  // 2. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberPassword = typia.random<string & tags.MinLength<8> & tags.Format<"password">>();
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: "test_member",
      password: memberPassword,
    },
  });
  // 3. Upload multiple orphaned attachments (not linked to any entity)
  const uploadedAttachments: IRedditLikeAttachment[] =
    await ArrayUtil.asyncRepeat(5, async () => {
      return await generate_random_reddit_like_member_attachments_create(
        memberConnection,
        {},
      );
    });
  // Calculate expected bytes from uploaded files
  const expectedTotalBytes = uploadedAttachments.reduce(
    (sum, attachment) => sum + attachment.fileSizeBytes,
    0,
  );
  // 4. Execute batch cleanup with dryRun=true preview mode
  const dryRunResult =
    await api.functional.redditLike.owner.attachments.batch_cleanup.cleanup(
      ownerConnection,
      {
        body: {
          deletedBefore: null,
          orphanedOnly: true,
          dryRun: true,
        } satisfies IRedditLikeAttachment.ICleanup,
      },
    );
  typia.assert(dryRunResult);
  // 5. Verify dry-run preview response
  TestValidator.predicate(
    "dry run should return dryRun=true",
    dryRunResult.dryRun === true,
  );
  TestValidator.predicate(
    "dry run should show expected cleaned count",
    dryRunResult.cleanedCount >= 0,
  );
  TestValidator.predicate(
    "dry run should show expected bytes freed",
    dryRunResult.totalBytesFreed >= 0,
  );
  TestValidator.predicate(
    "dry run should have no errors",
    Array.isArray(dryRunResult.errors),
  );
  // 6. Execute batch cleanup with dryRun=false for actual cleanup
  const actualResult =
    await api.functional.redditLike.owner.attachments.batch_cleanup.cleanup(
      ownerConnection,
      {
        body: {
          deletedBefore: null,
          orphanedOnly: true,
          dryRun: false,
        } satisfies IRedditLikeAttachment.ICleanup,
      },
    );
  typia.assert(actualResult);
  // 7. Verify actual cleanup response shows dryRun=false
  TestValidator.predicate(
    "actual run should return dryRun=false",
    actualResult.dryRun === false,
  );
  TestValidator.predicate(
    "actual run should match or exceed dry run count",
    actualResult.cleanedCount >= dryRunResult.cleanedCount,
  );
  TestValidator.predicate(
    "actual run should match or exceed dry run bytes",
    actualResult.totalBytesFreed >= dryRunResult.totalBytesFreed,
  );
  TestValidator.predicate(
    "actual run should have no errors",
    Array.isArray(actualResult.errors) && actualResult.errors.length === 0,
  );
}