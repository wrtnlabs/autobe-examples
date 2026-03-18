import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member list endpoint pagination and default sorting functionality.
 * Validates that the /hrms/members endpoint returns correctly paginated results
 * sorted by creation date (newest first) with proper metadata.
 */
export async function test_api_member_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for testing
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(member);
  // 2. Test default pagination (page 1, limit 20, sort by created_at desc)
  const defaultResult = await api.functional.hrms.members.index(
    memberConnection,
    {
      body: {} satisfies IHrmsMember.IRequest,
    },
  );
  typia.assert(defaultResult);
  // Validate pagination metadata
  TestValidator.equals("current page", defaultResult.pagination.current, 1);
  TestValidator.equals("limit", defaultResult.pagination.limit, 20);
  TestValidator.predicate(
    "total records exists",
    defaultResult.pagination.records > 0,
  );
  TestValidator.equals(
    "total pages calculation",
    defaultResult.pagination.pages,
    Math.ceil(
      defaultResult.pagination.records / defaultResult.pagination.limit,
    ) satisfies number as number,
  );
  // Validate member summary structure
  if (defaultResult.data.length > 0) {
    const firstMember = defaultResult.data[0];
    typia.assert(firstMember);
    // Verify required fields exist
    TestValidator.predicate("member has id", firstMember.id !== undefined);
    TestValidator.predicate(
      "member has email",
      firstMember.email !== undefined,
    );
    TestValidator.predicate(
      "member has display_name",
      firstMember.display_name !== undefined,
    );
    TestValidator.predicate(
      "member has avatar_uri",
      firstMember.avatar_uri !== undefined,
    );
    TestValidator.predicate(
      "member has phone_number",
      firstMember.phone_number !== undefined,
    );
    TestValidator.predicate(
      "member has organization_membership_count",
      firstMember.organization_membership_count !== undefined,
    );
    TestValidator.predicate(
      "member has created_at",
      firstMember.created_at !== undefined,
    );
    TestValidator.predicate(
      "member has updated_at",
      firstMember.updated_at !== undefined,
    );
    TestValidator.predicate(
      "member has deleted_at",
      firstMember.deleted_at !== undefined,
    );
  }
  // 3. Test different pagination parameters
  const limitedResult = await api.functional.hrms.members.index(
    memberConnection,
    {
      body: {
        limit: 10,
      } satisfies IHrmsMember.IRequest,
    },
  );
  typia.assert(limitedResult);
  TestValidator.equals("custom limit", limitedResult.pagination.limit, 10);
  const largerLimitResult = await api.functional.hrms.members.index(
    memberConnection,
    {
      body: {
        limit: 100,
      } satisfies IHrmsMember.IRequest,
    },
  );
  typia.assert(largerLimitResult);
  TestValidator.equals(
    "maximum limit",
    largerLimitResult.pagination.limit,
    100,
  );
  // 4. Test page navigation
  const page2Result = await api.functional.hrms.members.index(
    memberConnection,
    {
      body: {
        page: 2,
      } satisfies IHrmsMember.IRequest,
    },
  );
  typia.assert(page2Result);
  TestValidator.equals("page 2 current", page2Result.pagination.current, 2);
  const page3Result = await api.functional.hrms.members.index(
    memberConnection,
    {
      body: {
        page: 3,
      } satisfies IHrmsMember.IRequest,
    },
  );
  typia.assert(page3Result);
  TestValidator.equals("page 3 current", page3Result.pagination.current, 3);
  // 5. Verify sorting: first item should have the latest created_at
  if (defaultResult.data.length > 1) {
    const sortedMembers = defaultResult.data;
    for (let i = 0; i < sortedMembers.length - 1; i++) {
      const currentCreated = new Date(sortedMembers[i].created_at).getTime();
      const nextCreated = new Date(sortedMembers[i + 1].created_at).getTime();
      TestValidator.predicate(
        "items sorted by created_at descending",
        currentCreated >= nextCreated,
      );
    }
  }
  // 6. Test combination of page and limit
  const page2Limit50 = await api.functional.hrms.members.index(
    memberConnection,
    {
      body: {
        page: 2,
        limit: 50,
      } satisfies IHrmsMember.IRequest,
    },
  );
  typia.assert(page2Limit50);
  TestValidator.equals("page 2", page2Limit50.pagination.current, 2);
  TestValidator.equals("limit 50", page2Limit50.pagination.limit, 50);
}
