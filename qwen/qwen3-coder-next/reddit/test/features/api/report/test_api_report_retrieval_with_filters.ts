import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneContentReport";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_report_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and register
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // Create owner connection and register
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  // Login both users
  const moderatorLogin = await authorize_moderator_login(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    } satisfies IRedditCloneModerator.ILogin,
  });
  const ownerLogin = await authorize_owner_login(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://example.com/current",
      referrer: "https://example.com/previous",
    } satisfies IRedditCloneOwner.ILogin,
  });
  // Create community as owner
  const community = await generate_random_reddit_clone_owner_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // Create reporter member connection (simulated - using owner for simplicity)
  const reporterConnection: api.IConnection = { host: connection.host };
  // Create first post and report it
  const post1 = {
    id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    title: "Spam post title",
    content: "This is spam content for testing",
    created_at: new Date().toISOString(),
  };
  // Create second post and report it
  const post2 = {
    id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    title: "Harassment post",
    content: "This is harassment content",
    created_at: new Date().toISOString(),
  };
  // Get pending reports filtered by status
  const pendingReports =
    await api.functional.redditClone.moderator.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          status: "pending",
        },
      },
    );
  typia.assert(pendingReports);
  // Get post type reports
  const postReports =
    await api.functional.redditClone.moderator.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          contentTypeId: "post",
        },
      },
    );
  typia.assert(postReports);
  // Get reports by reporter (using reporter's ID)
  const reporterReports =
    await api.functional.redditClone.moderator.communities.reports.index(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          authorId: "some-reporter-id",
        },
      },
    );
  typia.assert(reporterReports);
  // Validate results
  TestValidator.predicate(
    "has pending reports",
    pendingReports.data.length > 0,
  );
  TestValidator.predicate("has post type reports", postReports.data.length > 0);
}
