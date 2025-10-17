import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberUser";
import type { IECommunityVisibility } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityVisibility";

/**
 * Public retrieval of a community by id after creation by a member.
 *
 * This test validates that a community created with public visibility can be
 * fetched without any Authorization header via GET
 * /communityPlatform/communities/{communityId}.
 *
 * Steps:
 *
 * 1. Join as a new member (obtain authenticated session automatically by SDK)
 * 2. Create a community with visibility set to "public"
 * 3. Create an unauthenticated connection (headers: {}) to emulate public access
 * 4. Retrieve the community by id using the unauthenticated connection
 * 5. Validate type safety and key field consistency between creation and retrieval
 */
export async function test_api_community_retrieval_public_by_id(
  connection: api.IConnection,
) {
  // 1) Member registration (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(10), // 3-20 chars, [A-Za-z0-9_]* — lowercase alphanum satisfies
    password: `A1${RandomGenerator.alphaNumeric(8)}`, // has letters+digits, length >= 8
    terms_accepted_at: new Date().toISOString(),
    privacy_accepted_at: new Date().toISOString(),
    marketing_opt_in: true,
  } satisfies ICommunityPlatformMemberUser.ICreate;
  const authorized = await api.functional.auth.memberUser.join(connection, {
    body: joinBody,
  });
  typia.assert(authorized);

  // 2) Create a public community as the authenticated member
  const visibility: IECommunityVisibility = "public";
  const createCommunityBody = {
    name: `c_${RandomGenerator.alphaNumeric(12)}`,
    visibility,
    nsfw: false,
    auto_archive_days: 30,
    language: "en",
    region: "US",
  } satisfies ICommunityPlatformCommunity.ICreate;
  const created: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: createCommunityBody },
    );
  typia.assert(created);

  // 3) Prepare an unauthenticated connection (no Authorization header)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4) Publicly retrieve the community by id
  const gotten = await api.functional.communityPlatform.communities.at(
    unauthConn,
    { communityId: created.id },
  );
  typia.assert(gotten);

  // 5) Validate essential field consistency
  TestValidator.equals(
    "community id is stable across create and public get",
    gotten.id,
    created.id,
  );
  TestValidator.equals(
    "community name matches on public retrieval",
    gotten.name,
    createCommunityBody.name,
  );
  TestValidator.equals(
    "visibility remains public on retrieval",
    gotten.visibility,
    createCommunityBody.visibility,
  );
  TestValidator.equals(
    "nsfw flag remains consistent",
    gotten.nsfw,
    createCommunityBody.nsfw,
  );
  TestValidator.equals(
    "auto_archive_days remains consistent",
    gotten.auto_archive_days,
    createCommunityBody.auto_archive_days,
  );
}
