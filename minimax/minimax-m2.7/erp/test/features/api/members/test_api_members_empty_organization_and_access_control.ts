import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_members_empty_organization_and_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Empty Organization
  // Create an organization context with no members
  const emptyOrgConnection: api.IConnection = { host: connection.host };
  // Call members endpoint for empty organization
  const emptyOrgResponse = await api.functional.erpHrm.members.index(
    emptyOrgConnection,
    {
      body: {
        page: 1 as number & typia.tags.Type<"int32"> & typia.tags.Minimum<1>,
        limit: 20 as number &
          typia.tags.Type<"int32"> &
          typia.tags.Minimum<1> &
          typia.tags.Maximum<100>,
      } satisfies IErpHrmMember.IRequest,
    },
  );
  typia.assert(emptyOrgResponse);
  // Validate empty response
  TestValidator.equals("data array should be empty", emptyOrgResponse.data, []);
  TestValidator.equals(
    "pagination records should be 0",
    emptyOrgResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    emptyOrgResponse.pagination.pages,
    0,
  );
  // Scenario 2: Invalid Organization Context
  // Attempt to call with invalid/missing organization context
  const invalidConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "should return 403 for invalid organization context",
    403,
    async () => {
      await api.functional.erpHrm.members.index(invalidConnection, {
        body: {} satisfies IErpHrmMember.IRequest,
      });
    },
  );
}
