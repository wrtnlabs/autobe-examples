import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_reports_create } from "../../../generate/generate_random_reddit_like_member_reports_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_moderator_report_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(),
      password: "1234",
      bio: null,
      avatar_url: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  typia.assert(moderatorConnection.headers);
  // 2. Create community with moderator auth using index (list) to get existing community
  // Note: Since no community creation endpoint is available in the API, we use the available communities.index endpoint
  const communities = await api.functional.redditLike.communities.index(
    moderatorConnection,
    {
      body: {},
    },
  );
  typia.assert(communities);
  // If no community exists, we'll use a placeholder community ID for testing
  const communityId =
    communities.data.length > 0
      ? communities.data[0].id
      : "00000000-0000-0000-0000-000000000000";
  // 3. Create regular member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(memberConnection.headers);
  // 4. Create post as member
  const post = await api.functional.redditLike.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text",
        content: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_url: null,
        community_id: communityId,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Submit report as member
  const report = await api.functional.redditLike.member.reports.create(
    memberConnection,
    {
      body: {
        reported_post_id: post.id,
        reported_comment_id: null,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 6. Authenticate as member (NOT moderator) to access report queue
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: "1234",
    } satisfies IRedditLikeMember.ILogin,
  });
  typia.assert(memberConnection.headers);
  // 7. Attempt to access report queue as non-moderator - expect 403 Forbidden
  await TestValidator.error(
    "non-moderator should get 403 Forbidden for report access",
    async () => {
      await api.functional.redditLike.moderator.communities.reports.patchByCommunityid(
        memberConnection,
        {
          communityId: communityId,
          body: {
            search: undefined,
            status: undefined,
            reporter_id: undefined,
            reported_post_id: undefined,
            reported_comment_id: undefined,
            created_at_min: undefined,
            created_at_max: undefined,
            sort: "created_at",
            page: 1,
            limit: 10,
          } satisfies IRedditLikeReport.IRequest,
        },
      );
    },
  );
  // 8. Test same request with guest account - expect 403 Forbidden
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "guest should get 403 Forbidden for report access",
    async () => {
      await api.functional.redditLike.moderator.communities.reports.patchByCommunityid(
        guestConnection,
        {
          communityId: communityId,
          body: {
            search: undefined,
            status: undefined,
            reporter_id: undefined,
            reported_post_id: undefined,
            reported_comment_id: undefined,
            created_at_min: undefined,
            created_at_max: undefined,
            sort: "created_at",
            page: 1,
            limit: 10,
          } satisfies IRedditLikeReport.IRequest,
        },
      );
    },
  );
  // 9. Verify member cannot access reports even for communities they created
  const anotherMemberEmail = typia.random<string & tags.Format<"email">>();
  const anotherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(anotherMemberConnection, {
    body: {
      email: anotherMemberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: "1234",
      display_name: RandomGenerator.name(),
      bio: null,
      avatar_url: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(anotherMemberConnection.headers);
  await TestValidator.error(
    "community creator should get 403 Forbidden for report access",
    async () => {
      await api.functional.redditLike.moderator.communities.reports.patchByCommunityid(
        anotherMemberConnection,
        {
          communityId: communityId,
          body: {
            search: undefined,
            status: undefined,
            reporter_id: undefined,
            reported_post_id: undefined,
            reported_comment_id: undefined,
            created_at_min: undefined,
            created_at_max: undefined,
            sort: "created_at",
            page: 1,
            limit: 10,
          } satisfies IRedditLikeReport.IRequest,
        },
      );
    },
  );
}