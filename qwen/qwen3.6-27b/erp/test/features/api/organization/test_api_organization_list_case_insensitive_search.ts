import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test name-based filtering with case-insensitive partial matching using ILIKE.
 *
 * Validates name-based organization search functionality by creating multiple organizations with specific naming patterns and verifying case-insensitive substring matching. The test ensures that partial matches, mixed-case queries, exact matches, and empty string filters behave correctly according to the ILIKE semantics.
 *
 * 1. Administrator creates multiple organizations with varying naming patterns (e.g., TechCorp, cybertech, TECH Inc, Orchard Inc, Default Org).
 * 2. Searches using exact case matching to confirm direct string matching works.
 * 3. Searches using mixed-case queries where lowercase 'tech' matches uppercase 'TECH Inc' and mixed-case 'cybertech'.
 * 4. Searches using partial substrings where 'ch' matches 'Orchard Inc'.
 * 5. Verifies that an empty string filter returns all active memberships for the authenticated member.
 */
export async function test_api_organization_list_case_insensitive_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator creates multiple organizations with different naming patterns
  const orgNames = [
    "TechCorp",
    "cybertech",
    "TECH Inc",
    "Orchard Inc",
    "Default Org",
  ];
  const connections: api.IConnection[] = [];
  const members: IHrmPlatformMember.IAuthorized[] = [];
  for (const orgName of orgNames) {
    const conn: api.IConnection = { host: connection.host };
    members.push(
      await authorize_member_join(conn, {
        body: { display_name: orgName },
      }),
    );
    connections.push(conn);
  }
  // 2. Search using exact case match ('TechCorp' should match 'TechCorp')
  const exactResult = await api.functional.hrmPlatform.organizations.index(
    connections[0],
    {
      body: { name: "TechCorp" } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(exactResult);
  TestValidator.equals("exact case match", exactResult.data.length, 1);
  TestValidator.equals("exact org name", exactResult.data[0].name, "TechCorp");
  // 3. Search using mixed case ('tech' should match 'cybertech')
  const mixedResult1 = await api.functional.hrmPlatform.organizations.index(
    connections[1],
    {
      body: { name: "tech" } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(mixedResult1);
  TestValidator.equals("mixed case match", mixedResult1.data.length, 1);
  TestValidator.equals(
    "cybertech matched",
    mixedResult1.data[0].name,
    "cybertech",
  );
  // 4. Search using mixed case partial match ('tech' should match 'TECH Inc')
  const mixedResult2 = await api.functional.hrmPlatform.organizations.index(
    connections[2],
    {
      body: { name: "tech" } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(mixedResult2);
  TestValidator.equals("mixed case partial match", mixedResult2.data.length, 1);
  TestValidator.equals(
    "TECH Inc matched by 'tech'",
    mixedResult2.data[0].name,
    "TECH Inc",
  );
  // 5. Search using partial substring ('ch' should match 'Orchard Inc')
  const partialResult = await api.functional.hrmPlatform.organizations.index(
    connections[3],
    {
      body: { name: "ch" } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(partialResult);
  TestValidator.equals("partial substring match", partialResult.data.length, 1);
  TestValidator.equals(
    "Orchard Inc matched",
    partialResult.data[0].name,
    "Orchard Inc",
  );
  // 6. Verify empty string filter returns all organizations (same as no filter)
  const emptyResult = await api.functional.hrmPlatform.organizations.index(
    connections[4],
    {
      body: { name: "" } satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty string filter returns org",
    emptyResult.data.length,
    1,
  );
  TestValidator.equals(
    "Default Org returned",
    emptyResult.data[0].name,
    "Default Org",
  );
}
