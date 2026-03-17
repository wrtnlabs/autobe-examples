import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";

export async function test_api_moderator_list_username_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the community owner with a known username containing 'alpha'
  const ownerUsername = `alpha_owner_${RandomGenerator.alphaNumeric(8)}`;
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      username: ownerUsername,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // 2. Create a community using the owner's connection
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    { body: {} },
  );
  typia.assert(community);
  // 3. Register a second member with a username containing 'beta'
  const betaUsername = `beta_mod_${RandomGenerator.alphaNumeric(8)}`;
  const betaConnection: api.IConnection = { host: connection.host };
  const betaAuth = await authorize_member_join(betaConnection, {
    body: {
      username: betaUsername,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(betaAuth);
  // 4. Assign the beta member as moderator of the community
  const moderatorRecord =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: { member_id: betaAuth.id },
      },
    );
  typia.assert(moderatorRecord);
  // --- Test A: search by 'beta' (moderator username) ---
  const resultBeta =
    await api.functional.community.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: { search: "beta" } satisfies ICommunityModerator.IRequest,
      },
    );
  typia.assert(resultBeta);
  TestValidator.equals(
    "beta search records count",
    resultBeta.pagination.records,
    1,
  );
  TestValidator.predicate(
    "beta search data has one entry",
    resultBeta.data.length === 1,
  );
  TestValidator.predicate(
    "beta search entry username contains 'beta'",
    resultBeta.data[0]!.member.username.toLowerCase().includes("beta"),
  );
  TestValidator.predicate(
    "beta search does not include alpha owner",
    !resultBeta.data.some((m) =>
      m.member.username.toLowerCase().includes("alpha"),
    ),
  );
  // --- Test B: search by 'alpha' (owner username) ---
  const resultAlpha =
    await api.functional.community.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: { search: "alpha" } satisfies ICommunityModerator.IRequest,
      },
    );
  typia.assert(resultAlpha);
  TestValidator.equals(
    "alpha search records count",
    resultAlpha.pagination.records,
    1,
  );
  TestValidator.predicate(
    "alpha search data has one entry",
    resultAlpha.data.length === 1,
  );
  TestValidator.predicate(
    "alpha search entry username contains 'alpha'",
    resultAlpha.data[0]!.member.username.toLowerCase().includes("alpha"),
  );
  // --- Test C: search with no match ---
  const resultNoMatch =
    await api.functional.community.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: { search: "zzznomatch" } satisfies ICommunityModerator.IRequest,
      },
    );
  typia.assert(resultNoMatch);
  TestValidator.equals(
    "no-match search records count",
    resultNoMatch.pagination.records,
    0,
  );
  TestValidator.predicate(
    "no-match search data is empty",
    resultNoMatch.data.length === 0,
  );
}
