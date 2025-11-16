import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformContentQuarantine } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentQuarantine";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformContentQuarantine } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformContentQuarantine";

/**
 * Validate advanced quarantine content search for administrator.
 *
 * This test ensures an administrator can
 *
 * - Join successfully,
 * - Create multiple content quarantine records for various resource types (post,
 *   comment, community),
 * - Search with various advanced filters (by quarantine_type, status, targets,
 *   and start time),
 * - Correctly receive paginated, filtered summaries that match query criteria.
 *
 * Steps:
 *
 * 1. Administrator joins (registers).
 * 2. Multiple content quarantine records are created:
 *
 *    - 1 targeting a post
 *    - 1 targeting a comment
 *    - 1 targeting a community
 *    - Variant quarantine types and statuses are used
 * 3. Perform filtered searches:
 *
 *    - Search only by quarantine_type
 *    - Search only by status
 *    - Search by target_post_id, target_comment_id, target_community_id
 *    - Search by start_after and start_before time window
 *    - Check pagination works with limit/page
 * 4. Validate search results:
 *
 *    - Each search result set contains only relevant quarantines
 *    - Returned ISummary objects include proper status, reason, and target entity
 *         reference
 */
export async function test_api_content_quarantine_advanced_search_administrator(
  connection: api.IConnection,
) {
  // 1. Administrator joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    business_status: RandomGenerator.pick([
      undefined,
      null,
      RandomGenerator.paragraph({ sentences: 2 }),
    ]),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create content quarantine records for different target resource types
  // We'll generate one for each: post, comment, community, with variant types/statuses
  const nowIso = new Date().toISOString();
  const types = ["spam", "abuse", "investigation", "legal_hold"] as const;
  const statuses = ["active", "lifted", "expired", "revoked"] as const;
  const uuid = () => typia.random<string & tags.Format<"uuid">>();
  const fakePostId = uuid();
  const fakeCommentId = uuid();
  const fakeCommunityId = uuid();

  // Quarantine for a POST
  const quarantinePost =
    await api.functional.communityPlatform.administrator.contentQuarantines.create(
      connection,
      {
        body: {
          quarantine_type: RandomGenerator.pick(types),
          status: RandomGenerator.pick(statuses),
          start_at: nowIso,
          target_post_id: fakePostId,
          target_comment_id: null,
          target_community_id: null,
          end_at: null,
          moderation_action_id: null,
        } satisfies ICommunityPlatformContentQuarantine.ICreate,
      },
    );
  typia.assert(quarantinePost);

  // Quarantine for a COMMENT
  const quarantineComment =
    await api.functional.communityPlatform.administrator.contentQuarantines.create(
      connection,
      {
        body: {
          quarantine_type: RandomGenerator.pick(types),
          status: RandomGenerator.pick(statuses),
          start_at: nowIso,
          target_post_id: null,
          target_comment_id: fakeCommentId,
          target_community_id: null,
          end_at: null,
          moderation_action_id: null,
        } satisfies ICommunityPlatformContentQuarantine.ICreate,
      },
    );
  typia.assert(quarantineComment);

  // Quarantine for a COMMUNITY
  const quarantineCommunity =
    await api.functional.communityPlatform.administrator.contentQuarantines.create(
      connection,
      {
        body: {
          quarantine_type: RandomGenerator.pick(types),
          status: RandomGenerator.pick(statuses),
          start_at: nowIso,
          target_post_id: null,
          target_comment_id: null,
          target_community_id: fakeCommunityId,
          end_at: null,
          moderation_action_id: null,
        } satisfies ICommunityPlatformContentQuarantine.ICreate,
      },
    );
  typia.assert(quarantineCommunity);

  // 3a. Search by quarantine_type
  const searchByTypeBody = {
    quarantine_type: quarantinePost.quarantine_type,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformContentQuarantine.IRequest;
  const resType =
    await api.functional.communityPlatform.administrator.contentQuarantines.index(
      connection,
      {
        body: searchByTypeBody,
      },
    );
  typia.assert(resType);
  TestValidator.predicate(
    "all results have searched quarantine_type",
    resType.data.every(
      (q) => q.quarantine_type === quarantinePost.quarantine_type,
    ),
  );

  // 3b. Search by status
  const searchByStatusBody = {
    status: quarantineComment.status,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformContentQuarantine.IRequest;
  const resStatus =
    await api.functional.communityPlatform.administrator.contentQuarantines.index(
      connection,
      {
        body: searchByStatusBody,
      },
    );
  typia.assert(resStatus);
  TestValidator.predicate(
    "all results have searched status",
    resStatus.data.every((q) => q.status === quarantineComment.status),
  );

  // 3c. Search by target_post_id
  const searchByPostBody = {
    target_post_id: quarantinePost.target_post_id!,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformContentQuarantine.IRequest;
  const resPost =
    await api.functional.communityPlatform.administrator.contentQuarantines.index(
      connection,
      {
        body: searchByPostBody,
      },
    );
  typia.assert(resPost);
  TestValidator.predicate(
    "all results have searched target_post_id",
    resPost.data.every(
      (q) => q.target_post?.id === quarantinePost.target_post_id,
    ),
  );

  // 3d. Search by target_comment_id
  const searchByCommentBody = {
    target_comment_id: quarantineComment.target_comment_id!,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformContentQuarantine.IRequest;
  const resComment =
    await api.functional.communityPlatform.administrator.contentQuarantines.index(
      connection,
      {
        body: searchByCommentBody,
      },
    );
  typia.assert(resComment);
  TestValidator.predicate(
    "all results have searched target_comment_id",
    resComment.data.every(
      (q) => q.target_comment?.id === quarantineComment.target_comment_id,
    ),
  );

  // 3e. Search by target_community_id
  const searchByCommunityBody = {
    target_community_id: quarantineCommunity.target_community_id!,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformContentQuarantine.IRequest;
  const resCommunity =
    await api.functional.communityPlatform.administrator.contentQuarantines.index(
      connection,
      {
        body: searchByCommunityBody,
      },
    );
  typia.assert(resCommunity);
  TestValidator.predicate(
    "all results have searched target_community_id",
    resCommunity.data.every(
      (q) => q.target_community?.id === quarantineCommunity.target_community_id,
    ),
  );

  // 3f. Search by start_after
  const searchByStartAfterBody = {
    start_after: nowIso,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformContentQuarantine.IRequest;
  const resStartAfter =
    await api.functional.communityPlatform.administrator.contentQuarantines.index(
      connection,
      {
        body: searchByStartAfterBody,
      },
    );
  typia.assert(resStartAfter);
  TestValidator.predicate(
    "all results start_at > start_after",
    resStartAfter.data.every((q) => q.start_at > nowIso),
  );

  // 3g. Search by start_before
  const searchByStartBeforeBody = {
    start_before: nowIso,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformContentQuarantine.IRequest;
  const resStartBefore =
    await api.functional.communityPlatform.administrator.contentQuarantines.index(
      connection,
      {
        body: searchByStartBeforeBody,
      },
    );
  typia.assert(resStartBefore);
  TestValidator.predicate(
    "all results start_at < start_before",
    resStartBefore.data.every((q) => q.start_at < nowIso),
  );

  // 3h. Test pagination works
  const searchPaginateBody = {
    page: 1,
    limit: 2,
  } satisfies ICommunityPlatformContentQuarantine.IRequest;
  const resPaginate =
    await api.functional.communityPlatform.administrator.contentQuarantines.index(
      connection,
      {
        body: searchPaginateBody,
      },
    );
  typia.assert(resPaginate);
  TestValidator.equals(
    "pagination returns at most requested limit",
    resPaginate.data.length <= 2,
    true,
  );
  TestValidator.equals(
    "pagination object present in response",
    typeof resPaginate.pagination === "object",
    true,
  );
}
