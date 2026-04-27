import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingInvitation";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingInvitation";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_invitations_create } from "../../../generate/generate_random_hrm_time_tracking_member_invitations_create";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_organizations_roles_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_roles_create";
import { prepare_random_hrm_time_tracking_invitation } from "../../../prepare/prepare_random_hrm_time_tracking_invitation";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_role } from "../../../prepare/prepare_random_hrm_time_tracking_role";

/**
 * Test pagination behavior and sorting options for the invitation list endpoint.
 *
 * Validates offset-based pagination with configurable page size, verifying correct data segmentation, accurate pagination metadata (current, limit, records, pages), and consistent sorting across multiple fields.
 *
 * Special attention is given to verifying complete relation data in each summary record, including the inviter member profile, assigned role summary, and null acceptor for pending invitations.
 *
 * 1. Join as a member, create an organization, switch to it, and create a custom role.
 * 2. Invite 3 different unregistered email addresses to create 3 pending invitations.
 * 3. Test pagination: page=1/limit=2 returns 2 records with current=1/limit=2/records=3/pages=2; page=2/limit=2 returns 1 record with current=2.
 * 4. Validate relation data: inviter (id, email, display_name), role (id, name, type), acceptor (null).
 * 5. Test sorting: email ascending, created_at descending (default), status ascending.
 */
export async function test_api_invitation_list_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: join as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Switch to the created organization as active context
  await api.functional.hrmTimeTracking.member.switch_organization.switchOrganization(
    memberConnection,
    { organizationId: organization.id },
  );
  // 4. Create a custom role with permissions
  const role =
    await generate_random_hrm_time_tracking_member_organizations_roles_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
      },
    );
  typia.assert(role);
  // 5. Create 3 pending invitations with different unique emails
  const emails = [
    typia.random<string & tags.Format<"email">>(),
    typia.random<string & tags.Format<"email">>(),
    typia.random<string & tags.Format<"email">>(),
  ];
  for (const email of emails) {
    const invitation =
      await generate_random_hrm_time_tracking_member_invitations_create(
        memberConnection,
        {
          body: {
            email,
            role_id: role.id,
          },
        },
      );
    typia.assert(invitation);
  }
  // 6. Test pagination: page=1, limit=2
  const pageSize = 2 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const bigLimit = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const firstPage = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const page1 = await api.functional.hrmTimeTracking.member.invitations.index(
    memberConnection,
    {
      body: {
        page: firstPage,
        limit: pageSize,
      } satisfies IHrmTimeTrackingInvitation.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 data count", page1.data.length, 2);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 2);
  TestValidator.equals("page 1 records", page1.pagination.records, 3);
  TestValidator.equals("page 1 pages", page1.pagination.pages, 2);
  // 7. Test pagination: page=2, limit=2
  const secondPage = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const page2 = await api.functional.hrmTimeTracking.member.invitations.index(
    memberConnection,
    {
      body: {
        page: secondPage,
        limit: pageSize,
      } satisfies IHrmTimeTrackingInvitation.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 data count", page2.data.length, 1);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 2);
  TestValidator.equals("page 2 records", page2.pagination.records, 3);
  TestValidator.equals("page 2 pages", page2.pagination.pages, 2);
  // 8. Validate relation data on all returned records
  const allReturned = [...page1.data, ...page2.data];
  for (let i = 0; i < allReturned.length; i++) {
    const record = allReturned[i];
    typia.assert(record);
    TestValidator.equals(`role ${i} name matches`, record.role.name, role.name);
    TestValidator.equals(
      `acceptor ${i} is null for pending`,
      record.acceptor,
      null,
    );
  }
  // 9. Test sorting by email ascending
  const sortedByEmail =
    await api.functional.hrmTimeTracking.member.invitations.index(
      memberConnection,
      {
        body: {
          sort: "email",
          limit: bigLimit,
        } satisfies IHrmTimeTrackingInvitation.IRequest,
      },
    );
  typia.assert(sortedByEmail);
  for (let i = 1; i < sortedByEmail.data.length; i++) {
    const prev = sortedByEmail.data[i - 1].email;
    const curr = sortedByEmail.data[i].email;
    TestValidator.predicate(
      `email sort ascending at index ${i}: ${prev} <= ${curr}`,
      prev.localeCompare(curr) <= 0,
    );
  }
  // 10. Test sorting by created_at descending (default sort)
  const sortedByCreatedAt =
    await api.functional.hrmTimeTracking.member.invitations.index(
      memberConnection,
      {
        body: {
          limit: bigLimit,
        } satisfies IHrmTimeTrackingInvitation.IRequest,
      },
    );
  typia.assert(sortedByCreatedAt);
  for (let i = 1; i < sortedByCreatedAt.data.length; i++) {
    const prev = sortedByCreatedAt.data[i - 1].created_at;
    const curr = sortedByCreatedAt.data[i].created_at;
    TestValidator.predicate(
      `created_at sort descending at index ${i}`,
      prev >= curr,
    );
  }
  // 11. Test sorting by status ascending
  const sortedByStatus =
    await api.functional.hrmTimeTracking.member.invitations.index(
      memberConnection,
      {
        body: {
          sort: "status",
          limit: bigLimit,
        } satisfies IHrmTimeTrackingInvitation.IRequest,
      },
    );
  typia.assert(sortedByStatus);
  for (let i = 1; i < sortedByStatus.data.length; i++) {
    const prev = sortedByStatus.data[i - 1].status;
    const curr = sortedByStatus.data[i].status;
    TestValidator.predicate(
      `status sort ascending at index ${i}: ${prev} <= ${curr}`,
      prev.localeCompare(curr) <= 0,
    );
  }
}
