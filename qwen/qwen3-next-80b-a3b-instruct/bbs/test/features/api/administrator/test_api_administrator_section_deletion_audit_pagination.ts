import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import type { IEconomicBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSectionDeletion";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardSectionDeletion";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_section_deletion_audit_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IEconomicBoardAdministrator.IJoin,
  });
  // Verify administrator is successfully authenticated
  typia.assert(adminConnection.headers?.Authorization);
  // First page: default limit (20 records)
  const firstPage: IPageIEconomicBoardSectionDeletion =
    await api.functional.economicBoard.administrator.audit.deletions.index(
      adminConnection,
    );
  typia.assert(firstPage);
  // Validate first page pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 20);
  TestValidator.predicate(
    "first page records >= 20",
    firstPage.pagination.records >= 20,
  );
  TestValidator.predicate(
    "first page pages >= 1",
    firstPage.pagination.pages >= 1,
  );
  TestValidator.equals("first page data length", firstPage.data.length, 20);
  // Second page: explicit page=2, limit=20 - CREATE NEW CONNECTION FOR ISOLATION
  const secondPageConnection: api.IConnection = { host: adminConnection.host };
  secondPageConnection.headers = adminConnection.headers; // Copy headers from authenticated connection
  const secondPage: IPageIEconomicBoardSectionDeletion =
    await api.functional.economicBoard.administrator.audit.deletions.index(
      secondPageConnection,
    );
  typia.assert(secondPage);
  // Validate second page pagination metadata
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 20);
  TestValidator.predicate(
    "second page records >= 20",
    secondPage.pagination.records >= 20,
  );
  TestValidator.predicate(
    "second page pages >= 2",
    secondPage.pagination.pages >= 2,
  );
  TestValidator.equals("second page data length", secondPage.data.length, 20);
  // Ensure records are distinct between the two pages
  const firstPageIds = firstPage.data.map((item) => item.section_id);
  const secondPageIds = secondPage.data.map((item) => item.section_id);
  const overlap = firstPageIds.filter((id) => secondPageIds.includes(id));
  TestValidator.equals("no overlapping section IDs", overlap.length, 0);
  // Validate that each deletion record has correct structure
  for (const deletion of [...firstPage.data, ...secondPage.data]) {
    typia.assertGuard(deletion as IEconomicBoardSectionDeletion);
  }
}
