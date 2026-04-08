import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_organization_listing_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  // 2. Retrieve paginated list of organizations
  const organizations = await api.functional.erpHrm.admin.organizations.index(
    adminConnection,
    {
      body: {
        page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IErpHrmOrganization.IRequest,
    },
  );
  // 3. Validate response structure and types
  typia.assert(organizations);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination.current is non-negative",
    organizations.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is between 1 and 100",
    organizations.pagination.limit >= 1 &&
      organizations.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    organizations.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    organizations.pagination.pages >= 0,
  );
  // 5. Validate organization data structure if any exists
  for (const org of organizations.data) {
    TestValidator.predicate(
      "organization has valid UUID id",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        org.id,
      ),
    );
    TestValidator.equals("organization has name", org.name !== undefined, true);
    TestValidator.equals(
      "organization has currency",
      org.currency !== undefined,
      true,
    );
    TestValidator.equals(
      "organization has timezone",
      org.timezone !== undefined,
      true,
    );
    TestValidator.equals(
      "organization has owner",
      org.owner !== undefined,
      true,
    );
  }
}
