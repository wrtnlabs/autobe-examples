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

export async function test_api_report_retrieval_authorization_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A creates a community and a post
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {},
    );
  const post = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    {
      body: {
        communityName: community.name,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
      },
    },
  );
  // 2. Member B joins, subscribes to community, and files a report
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  const report =
    await generate_random_reddit_clone_member_communities_reports_create(
      memberBConnection,
      {
        params: { communityName: community.name },
        body: {
          target_type: "post" as const,
          target_id: post.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  // 3. Member A attempts to retrieve Member B's report
  // This should fail with 403 Forbidden since Member A is not the reporter
  await TestValidator.httpError(
    "Member A cannot access Member B's report",
    403,
    async () =>
      await api.functional.redditClone.member.reports.at(memberAConnection, {
        reportId: report.id,
      }),
  );
}
