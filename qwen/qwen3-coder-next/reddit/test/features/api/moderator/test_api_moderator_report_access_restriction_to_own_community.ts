import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_posts_reports_create } from "../../../generate/generate_random_reddit_like_member_posts_reports_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";
import { prepare_random_reddit_like_report } from "../../../prepare/prepare_random_reddit_like_report";

export async function test_api_moderator_report_access_restriction_to_own_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Moderator A and Community A
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorA = await authorize_moderator_join(moderatorAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  const communityA =
    await generate_random_reddit_like_member_communities_create(
      moderatorAConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphaNumeric(8)}`,
          icon_url: `https://example.com/icon_a.png`,
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  // 2. Create Moderator B and Community B
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorB = await authorize_moderator_join(moderatorBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
    } satisfies IRedditLikeModerator.IJoin,
  });
  const communityB =
    await generate_random_reddit_like_member_communities_create(
      moderatorBConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphaNumeric(8)}`,
          icon_url: `https://example.com/icon_b.png`,
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  // 3. Create Member and Post in Community A
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // Member subscribes to Community A before posting
  await api.functional.redditLike.member.communities.create(memberConnection, {
    body: {
      name: communityA.name,
      icon_url: communityA.icon_url ?? undefined,
    } satisfies IRedditLikeCommunity.ICreate,
  });
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        content: RandomGenerator.content({ paragraphs: 3 }),
        url: null,
        image_url: null,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Member reports the post in Community A
  const report = await generate_random_reddit_like_member_posts_reports_create(
    memberConnection,
    {
      params: {
        postId: post.id,
      },
      body: {
        reason: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeReport.ICreate,
    },
  );
  typia.assert(report);
  // 5. Authenticate as Moderator B and attempt to access report for Community A
  const reportAccessConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(reportAccessConnection, {
    body: {
      email: moderatorB.email,
      password: (moderatorBConnection.headers?.Authorization as string).split(
        " ",
      )[1],
    } satisfies IRedditLikeModerator.ILogin,
  });
  // 6. Validate access restriction
  await TestValidator.error(
    "moderator B cannot access report for community A",
    async () => {
      await api.functional.redditLike.moderator.reports.at(
        reportAccessConnection,
        {
          reportId: report.id,
        },
      );
    },
  );
}