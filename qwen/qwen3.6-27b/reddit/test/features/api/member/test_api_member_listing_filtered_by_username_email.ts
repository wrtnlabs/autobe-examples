import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityMember";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member listing with username and email pattern (LIKE) filters.
 *
 * Validates that the member listing endpoint correctly applies LIKE pattern matching on both username and email fields. Creates three member accounts with distinct usernames and email addresses using unique prefixes. Then queries the listing endpoint with partial username and email patterns, verifying that only members matching each pattern are returned.
 *
 * Ensures that LIKE filtering narrows the result set appropriately and that the paginated response contains exactly the matching members with correct identity information.
 *
 * 1. Create three member accounts with unique username and email prefixes.
 * 2. Query member listing without filters to confirm all members exist.
 * 3. Query member listing with a username filter matching one member.
 * 4. Verify only the matching member is returned with correct identity.
 * 5. Query member listing with an email filter matching a different member.
 * 6. Verify only the matching member is returned with correct identity.
 */
export async function test_api_member_listing_filtered_by_username_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create three member accounts with distinct prefixes
  const alphaConnection: api.IConnection = { host: connection.host };
  const memberAlpha = await authorize_member_join(alphaConnection, {
    body: {
      username: "alpha_search_test_" + RandomGenerator.alphaNumeric(8),
      email: `alpha.search.test.${RandomGenerator.alphaNumeric(8)}@test.com`,
    },
  });
  typia.assert(memberAlpha);
  const betaConnection: api.IConnection = { host: connection.host };
  const memberBeta = await authorize_member_join(betaConnection, {
    body: {
      username: "beta_search_test_" + RandomGenerator.alphaNumeric(8),
      email: `beta.search.test.${RandomGenerator.alphaNumeric(8)}@test.com`,
    },
  });
  typia.assert(memberBeta);
  const gammaConnection: api.IConnection = { host: connection.host };
  const memberGamma = await authorize_member_join(gammaConnection, {
    body: {
      username: "gamma_search_test_" + RandomGenerator.alphaNumeric(8),
      email: `gamma.search.test.${RandomGenerator.alphaNumeric(8)}@test.com`,
    },
  });
  typia.assert(memberGamma);
  // 2. Query listing without filters to confirm all three members exist
  const unfilteredConnection: api.IConnection = { host: connection.host };
  const unfilteredList = await api.functional.redditLikeCommunity.members.index(
    unfilteredConnection,
    { body: {} satisfies IREdditLikeCommunityMember.IRequest },
  );
  typia.assert(unfilteredList);
  TestValidator.predicate(
    "unfiltered has all members",
    unfilteredList.data.length >= 3,
  );
  // 3. Query listing with username filter - use substring of alpha's username
  const usernameFilter = RandomGenerator.substring(memberAlpha.username);
  const usernameFilteredConnection: api.IConnection = { host: connection.host };
  const usernameFiltered =
    await api.functional.redditLikeCommunity.members.index(
      usernameFilteredConnection,
      {
        body: {
          username: usernameFilter,
        } satisfies IREdditLikeCommunityMember.IRequest,
      },
    );
  typia.assert(usernameFiltered);
  // 4. Verify only alpha member matches the username filter
  TestValidator.equals(
    "username filter returns one member",
    usernameFiltered.data.length,
    1,
  );
  TestValidator.equals(
    "username filter matches alpha member",
    usernameFiltered.data[0].username,
    memberAlpha.username,
  );
  TestValidator.equals(
    "alpha member id matches",
    usernameFiltered.data[0].id,
    memberAlpha.id,
  );
  // 5. Query listing with email filter - use substring of beta's email
  const emailFilter = RandomGenerator.substring(memberBeta.email);
  const emailFilteredConnection: api.IConnection = { host: connection.host };
  const emailFiltered = await api.functional.redditLikeCommunity.members.index(
    emailFilteredConnection,
    {
      body: {
        email: emailFilter,
      } satisfies IREdditLikeCommunityMember.IRequest,
    },
  );
  typia.assert(emailFiltered);
  // 6. Verify only beta member matches the email filter
  TestValidator.equals(
    "email filter returns one member",
    emailFiltered.data.length,
    1,
  );
  TestValidator.equals(
    "email filter matches beta member",
    emailFiltered.data[0].email,
    memberBeta.email,
  );
  TestValidator.equals(
    "beta member id matches",
    emailFiltered.data[0].id,
    memberBeta.id,
  );
}
