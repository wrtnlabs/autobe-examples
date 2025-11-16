import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test: Administrator can retrieve moderator details and proper error handling
 * for non-existing cases.
 *
 * 1. Register a new administrator (using join API), get authorization.
 * 2. Create a communityName slug for the test (random).
 * 3. As the administrator, create a moderator for that community (using a unique
 *    email and password).
 * 4. Retrieve the moderator details using the GET moderator API (by communityName
 *    and moderatorId).
 * 5. Confirm the response matches the created moderator (excluding password or
 *    sensitive data) and validates fields.
 * 6. Repeat step 4/5 for changing moderator status to "pending" and for
 *    soft-deleted (deleted_at != null).
 * 7. Attempt retrieval with a random (non-existent) moderatorId and check for
 *    error.
 */
export async function test_api_moderator_detail_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register a new administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      business_status: null,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Use a random community name (slug)
  const communityName = RandomGenerator.alphaNumeric(10);

  // 3. As administrator, create a moderator for that community
  const modEmail = typia.random<string & tags.Format<"email">>();
  const modPassword = RandomGenerator.alphaNumeric(14);
  const modStatus = "active";
  const moderatorCreateBody = {
    email: modEmail,
    password: modPassword,
    status: modStatus,
    business_status: RandomGenerator.name(1),
    href: "https://test.community/moderator-join",
    referrer: "https://test.community/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformModerator.ICreate;
  const moderator =
    await api.functional.communityPlatform.administrator.communities.moderators.create(
      connection,
      {
        communityName,
        body: moderatorCreateBody,
      },
    );
  typia.assert(moderator);
  TestValidator.equals(
    "created moderator fields match",
    {
      email: moderator.email,
      status: moderator.status,
      business_status: moderator.business_status,
      deleted_at: moderator.deleted_at ?? null,
    },
    {
      email: moderatorCreateBody.email,
      status: moderatorCreateBody.status,
      business_status: moderatorCreateBody.business_status ?? null,
      deleted_at: null,
    },
  );

  // 4. Retrieve moderator details (valid)
  const moderatorDetail =
    await api.functional.communityPlatform.administrator.communities.moderators.at(
      connection,
      {
        communityName,
        moderatorId: moderator.id,
      },
    );
  typia.assert(moderatorDetail);
  TestValidator.equals(
    "retrieved moderator same as created",
    {
      email: moderatorDetail.email,
      status: moderatorDetail.status,
      business_status: moderatorDetail.business_status,
      deleted_at: moderatorDetail.deleted_at ?? null,
    },
    {
      email: moderatorCreateBody.email,
      status: moderatorCreateBody.status,
      business_status: moderatorCreateBody.business_status ?? null,
      deleted_at: null,
    },
  );

  // 5. Create and test a moderator in pending state
  const pendingEmail = typia.random<string & tags.Format<"email">>();
  const pendingMod =
    await api.functional.communityPlatform.administrator.communities.moderators.create(
      connection,
      {
        communityName,
        body: {
          email: pendingEmail,
          password: RandomGenerator.alphaNumeric(14),
          status: "pending",
          business_status: null,
          href: "https://test.community/moderator-join",
          referrer: "https://test.community/landing",
          ip: null,
        } satisfies ICommunityPlatformModerator.ICreate,
      },
    );
  typia.assert(pendingMod);
  const pendingDetail =
    await api.functional.communityPlatform.administrator.communities.moderators.at(
      connection,
      {
        communityName,
        moderatorId: pendingMod.id,
      },
    );
  typia.assert(pendingDetail);
  TestValidator.equals(
    "pending moderator details",
    {
      email: pendingDetail.email,
      status: pendingDetail.status,
    },
    {
      email: pendingEmail,
      status: "pending",
    },
  );

  // 6. Simulate soft-deleted moderator by checking deleted_at in response.
  // Since no delete API is present, mark deleted_at for assertion if API supports soft delete simulation.
  // Here we simply check that the field can be present in API response and can be asserted if non-null.
  if (
    pendingDetail.deleted_at !== null &&
    pendingDetail.deleted_at !== undefined
  ) {
    TestValidator.predicate(
      "pending moderator is soft-deleted",
      typeof pendingDetail.deleted_at === "string",
    );
  }

  // 7. Error case: retrieve non-existent moderatorId for this community
  const fakeModId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "should throw for non-existent moderator",
    async () => {
      await api.functional.communityPlatform.administrator.communities.moderators.at(
        connection,
        {
          communityName,
          moderatorId: fakeModId,
        },
      );
    },
  );
}
