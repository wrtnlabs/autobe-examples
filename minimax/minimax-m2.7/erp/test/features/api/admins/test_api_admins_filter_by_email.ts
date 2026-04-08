import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admins_filter_by_email(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple admin accounts with known email addresses for testing
  const adminEmails = [
    typia.random<string & tags.Format<"email">>(),
    typia.random<string & tags.Format<"email">>(),
    typia.random<string & tags.Format<"email">>(),
  ];
  const createdAdmins: IErpHrmAdmin.ISummary[] = [];
  for (const email of adminEmails) {
    const adminConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_admin_join(adminConnection, {
      body: {
        email: email,
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(authorized);
    createdAdmins.push({
      id: authorized.id,
      email: authorized.email,
      displayName: authorized.displayName,
      avatarUri: authorized.avatarUri,
      phone: authorized.phone,
      createdAt: authorized.created_at,
    });
  }
  // Test 1: Filter by exact email match
  const exactEmail = createdAdmins[0].email;
  const exactMatchResponse = await api.functional.erpHrm.admins.index(
    connection,
    {
      body: {
        email: exactEmail,
        limit: 10,
      } satisfies IErpHrmAdmin.IRequest,
    },
  );
  typia.assert(exactMatchResponse);
  TestValidator.equals(
    "exact email match returns exactly 1 admin",
    exactMatchResponse.data.length,
    1,
  );
  TestValidator.equals(
    "exact email match returns correct admin",
    exactMatchResponse.data[0]?.email,
    exactEmail,
  );
  // Test 2: Filter by non-existent email returns empty array
  const nonExistentEmail = `nonexistent_${RandomGenerator.alphaNumeric(8)}@fake-domain.com`;
  const nonExistentResponse = await api.functional.erpHrm.admins.index(
    connection,
    {
      body: {
        email: nonExistentEmail,
        limit: 10,
      } satisfies IErpHrmAdmin.IRequest,
    },
  );
  typia.assert(nonExistentResponse);
  TestValidator.equals(
    "non-existent email returns empty data",
    nonExistentResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination shows 0 records for non-existent email",
    nonExistentResponse.pagination.records === 0,
  );
  // Test 3: Partial email match (domain portion)
  const domainPart = exactEmail.split("@")[1];
  if (domainPart) {
    const partialMatchResponse = await api.functional.erpHrm.admins.index(
      connection,
      {
        body: {
          email: domainPart,
          limit: 10,
        } satisfies IErpHrmAdmin.IRequest,
      },
    );
    typia.assert(partialMatchResponse);
    // All returned admins should have emails containing the domain part
    for (const admin of partialMatchResponse.data) {
      TestValidator.predicate(
        `admin email contains domain ${domainPart}`,
        admin.email.includes(domainPart),
      );
    }
  }
  // Test 4: Verify all created admins are accessible via general query
  const allAdminsResponse = await api.functional.erpHrm.admins.index(
    connection,
    {
      body: {
        limit: 100,
      } satisfies IErpHrmAdmin.IRequest,
    },
  );
  typia.assert(allAdminsResponse);
  TestValidator.predicate(
    "created admins are included in full list",
    allAdminsResponse.data.some(
      (admin) => admin.email === createdAdmins[0].email,
    ),
  );
}
