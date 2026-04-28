import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityProfile";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_profiles_filter_karma_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create three members to ensure variance in karma scores
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberC = await authorize_member_join(memberCConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(memberA);
  typia.assert(memberB);
  typia.assert(memberC);
  // 2. Determine range based on actual karma scores of created members
  // Since karma is not settable on join, we use the actual values to test the filter logic
  const karmaA: number = memberA.karma;
  const karmaB: number = memberB.karma;
  const karmaC: number = memberC.karma;
  const minKarma: number = Math.min(karmaA, karmaB, karmaC);
  const maxKarma: number = Math.max(karmaA, karmaB, karmaC);
  // 3. Query profiles with the calculated karma range
  const response = await api.functional.redditLikeCommunity.profiles.index(
    connection,
    {
      body: {
        min_karma: minKarma,
        max_karma: maxKarma,
      } satisfies IREdditLikeCommunityProfile.IRequest,
    },
  );
  typia.assert(response);
  // 4. Verify that all returned profiles fall within the specified range
  for (const profile of response.data) {
    TestValidator.predicate(
      `profile ${profile.id} karma ${profile.karma} is >= ${minKarma}`,
      profile.karma >= minKarma,
    );
    TestValidator.predicate(
      `profile ${profile.id} karma ${profile.karma} is <= ${maxKarma}`,
      profile.karma <= maxKarma,
    );
  }
}
