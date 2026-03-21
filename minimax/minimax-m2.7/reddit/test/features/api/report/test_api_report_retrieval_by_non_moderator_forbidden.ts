import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_reports_create } from "../../../generate/generate_random_reddit_clone_member_communities_reports_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_report } from "../../../prepare/prepare_random_reddit_clone_report";

export async function test_api_report_retrieval_by_non_moderator_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for authorization enforcement - non-moderator cannot view community reports.
  // 1. Authenticate as member1 who will be the community owner
  // 2. Create a community 'restrictedcommunity' with member1 as owner
  // 3. Authenticate as member2 who will author the reported post
  // 4. Create a text post by member2 in 'restrictedcommunity'
  // 5. Authenticate as member3 (regular member, not moderator)
  // 6. Create a report against the post as member3
  // 7. As member3 (non-moderator), attempt to retrieve the report
  // 8. Verify response returns 403 Forbidden
  // 9. Verify response indicates the user lacks moderator privileges for this community
  // 1. Authenticate as member1 who will be the community owner
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: `owner_${RandomGenerator.alphaNumeric(8)}`,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(member1);
  // 2. Create a community with member1 as owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      member1Connection,
      {
        body: {
          name: `restrictedcommunity_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Authenticate as member2 who will author the reported post
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: `poster_${RandomGenerator.alphaNumeric(8)}`,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(member2);
  // 4. Create a text post by member2 in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    member2Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 5. Authenticate as member3 (regular member, not moderator)
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: `reporter_${RandomGenerator.alphaNumeric(8)}`,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(member3);
  // 6. Create a report against the post as member3
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      member3Connection,
      {
        params: {
          communityName: community.name,
        },
        body: {
          target_type: "post",
          target_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(report);
  // 7. As member3 (non-moderator), attempt to retrieve the report
  // 8. Verify response returns 403 Forbidden
  await TestValidator.httpError(
    "non-moderator cannot retrieve community reports",
    403,
    async () => {
      await api.functional.redditClone.member.communities.reports.at(
        member3Connection,
        {
          communityName: community.name,
          reportId: report.id,
        },
      );
    },
  );
}
