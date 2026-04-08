import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_member_list_organization_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create organization contexts and test members
  const adminConnection: api.IConnection = { host: connection.host };
  // Create Organization A members
  const orgAMembers: string[] = ArrayUtil.repeat(3, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // Create Organization B members (exclusive)
  const orgBMembers: string[] = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  // Create shared member (belongs to both Org A and Org B)
  const sharedMemberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Test Organization A context
  const orgAUserConnection: api.IConnection = { host: connection.host };
  const orgAResponse = await api.functional.hrmPlatform.members.index(
    orgAUserConnection,
    {
      body: {
        limit: 100,
      } satisfies IHrmPlatformMember.IRequest,
    },
  );
  typia.assert(orgAResponse);
  // 3. Test Organization B context
  const orgBUserConnection: api.IConnection = { host: connection.host };
  const orgBResponse = await api.functional.hrmPlatform.members.index(
    orgBUserConnection,
    {
      body: {
        limit: 100,
      } satisfies IHrmPlatformMember.IRequest,
    },
  );
  typia.assert(orgBResponse);
  // 4. Validate Organization A isolation
  TestValidator.equals(
    "Org A pagination records count",
    orgAResponse.pagination.records,
    4,
  );
  TestValidator.equals(
    "Org A pagination pages count",
    orgAResponse.pagination.pages,
    1,
  );
  // 5. Validate Organization B isolation
  TestValidator.equals(
    "Org B pagination records count",
    orgBResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "Org B pagination pages count",
    orgBResponse.pagination.pages,
    1,
  );
  // 6. Verify shared member appears in both contexts
  const orgAHasSharedMember = orgAResponse.data.some(
    (member) => member.id === sharedMemberId,
  );
  TestValidator.predicate("shared member exists in Org A", orgAHasSharedMember);
  const orgBHasSharedMember = orgBResponse.data.some(
    (member) => member.id === sharedMemberId,
  );
  TestValidator.predicate("shared member exists in Org B", orgBHasSharedMember);
  // 7. Verify no cross-organization data leakage
  const orgADataIds = new Set(orgAResponse.data.map((m) => m.id));
  const orgBDataIds = new Set(orgBResponse.data.map((m) => m.id));
  // Check that orgA doesn't contain any exclusive orgB members
  for (const orgBMemberId of orgBMembers) {
    TestValidator.predicate(
      `Org A does not contain exclusive Org B member ${orgBMemberId}`,
      !orgADataIds.has(orgBMemberId),
    );
  }
  // Check that orgB doesn't contain any exclusive orgA members
  for (const orgAMemberId of orgAMembers) {
    TestValidator.predicate(
      `Org B does not contain exclusive Org A member ${orgAMemberId}`,
      !orgBDataIds.has(orgAMemberId),
    );
  }
}
