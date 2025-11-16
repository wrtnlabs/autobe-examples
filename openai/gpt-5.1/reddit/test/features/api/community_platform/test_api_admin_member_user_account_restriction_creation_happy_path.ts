import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAccountRestrictionOfAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfAdminUser";
import type { ICommunityPlatformAccountRestrictionOfMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestrictionOfMemberUser";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";

export async function test_api_admin_member_user_account_restriction_creation_happy_path(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser via join to obtain admin context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a generic account restriction episode (not strictly required
  //    for linkage, but validates base endpoint and provides a comparison
  //    shape).
  const now = new Date();
  const startsAt: string & tags.Format<"date-time"> =
    now.toISOString() as string & tags.Format<"date-time">;
  const endsAtDate = new Date(now.getTime() + 60 * 60 * 1000);
  const endsAt: string & tags.Format<"date-time"> =
    endsAtDate.toISOString() as string & tags.Format<"date-time">;

  const genericRestrictionBody = {
    account_type: "member",
    scope: "posting",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 5 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const genericRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.accountRestrictions.create(
      connection,
      {
        body: genericRestrictionBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(genericRestriction);

  // 3. Assume an existing member user identified by username. Since the
  //    member creation API is not in scope, we rely on fixtures or simulation
  //    environment and focus on the behavior of the restriction endpoint.
  const memberUsername: string = RandomGenerator.name(1);

  // Prepare a member-scoped restriction body. Keep account_type aligned with
  // member accounts and reuse scope/reason for clarity.
  const memberRestrictionBody = {
    account_type: "member",
    scope: "posting",
    reason_category: "policy_violation",
    reason_detail: RandomGenerator.paragraph({ sentences: 3 }),
    starts_at: startsAt,
    ends_at: endsAt,
  } satisfies ICommunityPlatformAccountRestriction.ICreate;

  const memberRestriction: ICommunityPlatformAccountRestriction =
    await api.functional.communityPlatform.adminUser.memberUsers.accountRestrictions.create(
      connection,
      {
        username: memberUsername,
        body: memberRestrictionBody,
      },
    );
  typia.assert<ICommunityPlatformAccountRestriction>(memberRestriction);

  // 4. Validate that the returned restriction reflects the request payload
  //    and has correct linkage and admin metadata.
  TestValidator.equals(
    "account_type should match the payload for member restriction",
    memberRestriction.account_type,
    memberRestrictionBody.account_type,
  );
  TestValidator.equals(
    "scope should match the payload for member restriction",
    memberRestriction.scope,
    memberRestrictionBody.scope,
  );
  TestValidator.equals(
    "reason_category should match the payload for member restriction",
    memberRestriction.reason_category,
    memberRestrictionBody.reason_category,
  );
  TestValidator.equals(
    "starts_at should match the payload for member restriction",
    memberRestriction.starts_at,
    memberRestrictionBody.starts_at,
  );
  TestValidator.equals(
    "ends_at should match the payload for member restriction",
    memberRestriction.ends_at ?? null,
    memberRestrictionBody.ends_at ?? null,
  );

  // 5. Validate that the restriction is associated with an admin creator.
  TestValidator.predicate(
    "createdByAdminUser should be present on member restriction",
    () =>
      memberRestriction.createdByAdminUser !== null &&
      memberRestriction.createdByAdminUser !== undefined,
  );

  if (
    memberRestriction.createdByAdminUser !== null &&
    memberRestriction.createdByAdminUser !== undefined
  ) {
    typia.assert<ICommunityPlatformAdminuser.ISummary>(
      memberRestriction.createdByAdminUser,
    );
    TestValidator.predicate(
      "createdByAdminUser.displayName should be non-empty",
      () => memberRestriction.createdByAdminUser!.displayName.length > 0,
    );
  }

  // 6. Validate that the restriction is linked to a member user via the
  //    memberUserRestriction summary.
  TestValidator.predicate(
    "memberUserRestriction linkage summary should be present for member restriction",
    () =>
      memberRestriction.memberUserRestriction !== null &&
      memberRestriction.memberUserRestriction !== undefined,
  );

  if (
    memberRestriction.memberUserRestriction !== null &&
    memberRestriction.memberUserRestriction !== undefined
  ) {
    const memberLink: ICommunityPlatformAccountRestrictionOfMemberUser.ISummary =
      memberRestriction.memberUserRestriction;
    typia.assert<ICommunityPlatformAccountRestrictionOfMemberUser.ISummary>(
      memberLink,
    );

    // Ensure the foreign key linkage IDs are non-null UUIDs (typia already
    // validates format; here we assert non-null semantics).
    TestValidator.predicate(
      "memberUserRestriction.community_platform_account_restriction_id should be a non-empty UUID",
      () => memberLink.community_platform_account_restriction_id.length > 0,
    );
    TestValidator.predicate(
      "memberUserRestriction.community_platform_memberuser_id should be a non-empty UUID",
      () => memberLink.community_platform_memberuser_id.length > 0,
    );

    if (memberLink.memberUser !== null && memberLink.memberUser !== undefined) {
      typia.assert<ICommunityPlatformMemberuser.ISummary>(
        memberLink.memberUser,
      );
      // We cannot guarantee the fixture username, but when the backend echoes
      // the linked member user, ensure the username field is non-empty.
      TestValidator.predicate(
        "linked memberUser.username should be non-empty",
        () => memberLink.memberUser!.username.length > 0,
      );
    }
  }
}
