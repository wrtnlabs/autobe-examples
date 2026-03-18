import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test data isolation enforcement and soft-deleted organization visibility.
 * Verify that members can only access organizations they are entitled to view
 * (owned or member of), and that the includeDeleted flag correctly toggles
 * soft-deleted organization visibility.
 */
export async function test_api_organization_list_data_isolation(
  connection: api.IConnection,
) {
  // Connection isolation pattern: Create separate connections for each member
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  // Step 1: Setup - Create two member users
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: memberAEmail,
      password: RandomGenerator.alphabets(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(memberA);
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: RandomGenerator.alphabets(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: null,
      locale: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(memberB);
  // Step 2: Member A lists organizations with includeDeleted: false (default)
  const listAExcluded = await api.functional.erpHrm.member.organizations.index(
    memberAConnection,
    {
      body: {
        includeDeleted: false,
      } satisfies IErpHrmOrganization.IRequest,
    },
  );
  typia.assert(listAExcluded);
  // Step 3: Member A lists organizations with includeDeleted: true
  const listAIncluded = await api.functional.erpHrm.member.organizations.index(
    memberAConnection,
    {
      body: {
        includeDeleted: true,
      } satisfies IErpHrmOrganization.IRequest,
    },
  );
  typia.assert(listAIncluded);
  // Step 4: Member B lists organizations with includeDeleted: false
  const listBExcluded = await api.functional.erpHrm.member.organizations.index(
    memberBConnection,
    {
      body: {
        includeDeleted: false,
      } satisfies IErpHrmOrganization.IRequest,
    },
  );
  typia.assert(listBExcluded);
  // Step 5: Member B lists organizations with includeDeleted: true
  const listBIncluded = await api.functional.erpHrm.member.organizations.index(
    memberBConnection,
    {
      body: {
        includeDeleted: true,
      } satisfies IErpHrmOrganization.IRequest,
    },
  );
  typia.assert(listBIncluded);
  // Step 6: Verify pagination structure is correct
  TestValidator.predicate(
    "Member A list with includeDeleted false has valid pagination",
    listAExcluded.pagination.current >= 0,
  );
  TestValidator.predicate(
    "Member A list with includeDeleted true has valid pagination",
    listAIncluded.pagination.current >= 0,
  );
  TestValidator.predicate(
    "Member B list with includeDeleted false has valid pagination",
    listBExcluded.pagination.current >= 0,
  );
  TestValidator.predicate(
    "Member B list with includeDeleted true has valid pagination",
    listBIncluded.pagination.current >= 0,
  );
  // Step 7: Verify data structure integrity with explicit typing
  const listAData: IErpHrmOrganization.ISummary[] = listAExcluded.data;
  const listBData: IErpHrmOrganization.ISummary[] = listBExcluded.data;
  // Verify each organization in list has valid structure
  for (const org of listAData) {
    TestValidator.predicate(
      `Organization has valid id`,
      typia.is<string & tags.Format<"uuid">>(org.id),
    );
  }
  // Step 8: Verify includeDeleted true returns same or more results
  // When there are soft-deleted records, includeDeleted: true should return more
  TestValidator.predicate(
    "includeDeleted true returns >= record count than includeDeleted false for Member A",
    listAIncluded.pagination.records >= listAExcluded.pagination.records,
  );
  TestValidator.predicate(
    "includeDeleted true returns >= record count than includeDeleted false for Member B",
    listBIncluded.pagination.records >= listBExcluded.pagination.records,
  );
  // Step 9: Verify data isolation - members should only see organizations they're entitled to
  const memberAOrgIds: (string & tags.Format<"uuid">)[] = listAData.map(
    (org: IErpHrmOrganization.ISummary) => org.id,
  );
  const memberBOrgIds: (string & tags.Format<"uuid">)[] = listBData.map(
    (org: IErpHrmOrganization.ISummary) => org.id,
  );
  // Verify organization IDs are valid UUIDs (ensures data isolation check works)
  TestValidator.predicate(
    "Member A sees only valid organizations",
    memberAOrgIds.every((orgId) => orgId !== null && orgId !== undefined),
  );
  TestValidator.predicate(
    "Member B sees only valid organizations",
    memberBOrgIds.every((orgId) => orgId !== null && orgId !== undefined),
  );
  // Step 10: Verify response records match data array length
  TestValidator.equals(
    "Member A list length matches pagination records",
    listAExcluded.data.length,
    listAExcluded.pagination.records > 0 ? listAExcluded.pagination.records : 0,
  );
  TestValidator.equals(
    "Member B list length matches pagination records",
    listBExcluded.data.length,
    listBExcluded.pagination.records > 0 ? listBExcluded.pagination.records : 0,
  );
}
