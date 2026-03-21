import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
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
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";

export async function test_api_report_update_denied_for_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A creates community
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(memberA);
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 2. Member A creates post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "text",
      },
    },
  );
  typia.assert(post);
  // 3. Member B creates account
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(memberB);
  // 4. Member B creates comment (reportable content)
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberBConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(comment);
  // 5. Member C creates account (not a moderator)
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    },
  });
  typia.assert(memberC);
  // 6. Member C attempts to update report status (should be rejected)
  await TestValidator.error("non moderator cannot update report", async () => {
    await api.functional.redditClone.member.reports.update(memberCConnection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        status: "approved",
      },
    });
  });
  // 7. Verify with different status attempt
  await TestValidator.error("non moderator cannot dismiss report", async () => {
    await api.functional.redditClone.member.reports.update(memberCConnection, {
      reportId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        status: "dismissed",
      },
    });
  });
}
