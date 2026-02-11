import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_reddit_platform_reports_create } from "../../../generate/generate_random_reddit_platform_member_reddit_platform_reports_create";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_report } from "../../../prepare/prepare_random_reddit_platform_report";

export async function test_api_report_own_post_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login member
  const memberConnection: api.IConnection = { host: connection.host };
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const member: IRedditPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: joinPassword,
        username: RandomGenerator.name(),
      },
    },
  );
  // 2. Create a post as the same member
  const postConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(postConnection, {
    body: {
      email: member.email,
      password: joinPassword,
    } satisfies IRedditPlatformMember.ILogin,
  });
  const post = await api.functional.redditPlatform.member.posts.create(
    postConnection,
    {
      body: {
        communityId: "00000000-0000-0000-0000-000000000000" satisfies string &
          tags.Format<"uuid">,
        title: RandomGenerator.name(3),
        type: "TEXT" satisfies "TEXT",
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Attempt to report own post (should fail)
  await TestValidator.error("self-report should be blocked", async () => {
    await api.functional.redditPlatform.member.redditPlatform.reports.create(
      memberConnection,
      {
        body: {
          reported_type: "POST" satisfies "POST",
          reported_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditPlatformReport.ICreate,
      },
    );
  });
}
