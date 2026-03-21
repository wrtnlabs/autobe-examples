import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmActivityLog";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_activity_logs_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as admin with org:manage permission
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_join(adminConnection, {});
  typia.assert(authorized);
  // Use random organization UUID for testing
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  // 2. Retrieve activity logs with default pagination (page 1, limit 20)
  const response =
    await api.functional.erpHrm.admin.organizations.activity_logs.index(
      adminConnection,
      {
        organizationId,
        body: {
          page: 1,
          limit: 20,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array exists
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // 5. Validate activity log entry structure for each entry
  for (const log of response.data) {
    TestValidator.predicate(
      "log id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        log.id,
      ),
    );
    TestValidator.predicate(
      "log has action_type",
      typeof log.action_type === "string",
    );
    TestValidator.predicate(
      "log has target_entity_type",
      typeof log.target_entity_type === "string",
    );
    TestValidator.predicate(
      "log target_entity_id is valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        log.target_entity_id,
      ),
    );
    TestValidator.predicate(
      "log has member info",
      log.member !== null && typeof log.member === "object",
    );
    TestValidator.predicate(
      "log has created_at",
      typeof log.created_at === "string",
    );
    // Validate member structure
    if (log.member) {
      TestValidator.predicate(
        "member id is valid UUID",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          log.member.id,
        ),
      );
      TestValidator.predicate(
        "member has email",
        typeof log.member.email === "string",
      );
      TestValidator.predicate(
        "member has displayName",
        typeof log.member.displayName === "string",
      );
    }
  }
  // 6. Test pagination navigation - request page 2 with limit 5
  const page2Response =
    await api.functional.erpHrm.admin.organizations.activity_logs.index(
      adminConnection,
      {
        organizationId,
        body: {
          page: 2,
          limit: 5,
        } satisfies IErpHrmActivityLog.IRequest,
      },
    );
  typia.assert(page2Response);
  // 7. Validate pagination for page 2
  TestValidator.equals(
    "page 2 current is 2",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit is 5", page2Response.pagination.limit, 5);
  TestValidator.predicate(
    "page 2 data is array",
    Array.isArray(page2Response.data),
  );
  // 8. Validate default sorting (created_at descending - most recent first)
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = new Date(response.data[i].created_at).getTime();
      const next = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `log ${i} is not older than log ${i + 1}`,
        current >= next,
      );
    }
  }
}
