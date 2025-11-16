import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformContentQuarantine } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentQuarantine";

/**
 * Validate that an administrator can create content quarantine records
 * targeting posts, comments, and communities.
 *
 * 1. Register and authenticate as an administrator.
 * 2. Create a content quarantine targeting a post, verify result.
 * 3. Create a content quarantine targeting a comment, verify result.
 * 4. Create a content quarantine targeting a community, verify result.
 * 5. Test error: missing all target IDs should fail.
 */
export async function test_api_content_quarantine_creation_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as an administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      business_status: RandomGenerator.paragraph({ sentences: 1 }),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Create a content quarantine targeting a post
  const postTargetId = typia.random<string & tags.Format<"uuid">>();
  const quarantinePost =
    await api.functional.communityPlatform.administrator.contentQuarantines.create(
      connection,
      {
        body: {
          quarantine_type: "spam",
          status: "active",
          start_at: new Date().toISOString(),
          target_post_id: postTargetId,
          target_comment_id: null,
          target_community_id: null,
          end_at: null,
          moderation_action_id: null,
        } satisfies ICommunityPlatformContentQuarantine.ICreate,
      },
    );
  typia.assert(quarantinePost);
  TestValidator.equals(
    "post quarantine status",
    quarantinePost.status,
    "active",
  );
  TestValidator.equals(
    "post quarantine - correct target_post_id",
    quarantinePost.target_post_id,
    postTargetId,
  );
  TestValidator.equals(
    "post quarantine - target_comment_id is null",
    quarantinePost.target_comment_id,
    null,
  );
  TestValidator.equals(
    "post quarantine - target_community_id is null",
    quarantinePost.target_community_id,
    null,
  );

  // 3. Create a content quarantine targeting a comment
  const commentTargetId = typia.random<string & tags.Format<"uuid">>();
  const quarantineComment =
    await api.functional.communityPlatform.administrator.contentQuarantines.create(
      connection,
      {
        body: {
          quarantine_type: "abuse",
          status: "active",
          start_at: new Date().toISOString(),
          target_post_id: null,
          target_comment_id: commentTargetId,
          target_community_id: null,
          end_at: null,
          moderation_action_id: null,
        } satisfies ICommunityPlatformContentQuarantine.ICreate,
      },
    );
  typia.assert(quarantineComment);
  TestValidator.equals(
    "comment quarantine - correct target_comment_id",
    quarantineComment.target_comment_id,
    commentTargetId,
  );
  TestValidator.equals(
    "comment quarantine - target_post_id is null",
    quarantineComment.target_post_id,
    null,
  );
  TestValidator.equals(
    "comment quarantine - target_community_id is null",
    quarantineComment.target_community_id,
    null,
  );

  // 4. Create a content quarantine targeting a community
  const communityTargetId = typia.random<string & tags.Format<"uuid">>();
  const quarantineCommunity =
    await api.functional.communityPlatform.administrator.contentQuarantines.create(
      connection,
      {
        body: {
          quarantine_type: "investigation",
          status: "active",
          start_at: new Date().toISOString(),
          target_post_id: null,
          target_comment_id: null,
          target_community_id: communityTargetId,
          end_at: null,
          moderation_action_id: null,
        } satisfies ICommunityPlatformContentQuarantine.ICreate,
      },
    );
  typia.assert(quarantineCommunity);
  TestValidator.equals(
    "community quarantine - correct target_community_id",
    quarantineCommunity.target_community_id,
    communityTargetId,
  );
  TestValidator.equals(
    "community quarantine - target_post_id is null",
    quarantineCommunity.target_post_id,
    null,
  );
  TestValidator.equals(
    "community quarantine - target_comment_id is null",
    quarantineCommunity.target_comment_id,
    null,
  );

  // 5. Test error: missing all target IDs should fail
  await TestValidator.error(
    "should fail when all target IDs are missing",
    async () => {
      await api.functional.communityPlatform.administrator.contentQuarantines.create(
        connection,
        {
          body: {
            quarantine_type: "abuse",
            status: "active",
            start_at: new Date().toISOString(),
            target_post_id: null,
            target_comment_id: null,
            target_community_id: null,
            end_at: null,
            moderation_action_id: null,
          } satisfies ICommunityPlatformContentQuarantine.ICreate,
        },
      );
    },
  );
}
