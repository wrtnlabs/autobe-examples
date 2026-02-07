import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardErrorLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardErrorLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardErrorLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_error_logs_admin_component_focused_debugging(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test filtering by realistic system components
  const realisticComponents = ["authentication", "database", "api"] as const;
  // Test single component filtering
  const singleComponentRequest: IDiscussionBoardErrorLog.IRequest = {
    components: ["authentication"],
  };
  const singleComponentResponse =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      { body: singleComponentRequest },
    );
  typia.assert(singleComponentResponse);
  // Test multiple components filtering
  const multiComponentRequest: IDiscussionBoardErrorLog.IRequest = {
    components: ["database", "api"],
  };
  const multiComponentResponse =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      { body: multiComponentRequest },
    );
  typia.assert(multiComponentResponse);
  // Test empty components (should return all errors)
  const allComponentsRequest: IDiscussionBoardErrorLog.IRequest = {
    components: [],
  };
  const allComponentsResponse =
    await api.functional.discussionBoard.admin.error_logs.index(
      adminConnection,
      { body: allComponentsRequest },
    );
  typia.assert(allComponentsResponse);
  // Validate that component filtering works as expected
  if (singleComponentResponse.data.length > 0) {
    TestValidator.predicate(
      "authentication component filter returns authentication errors",
      singleComponentResponse.data.every(
        (log) => log.component === "authentication",
      ),
    );
  }
  if (multiComponentResponse.data.length > 0) {
    TestValidator.predicate(
      "multi-component filter returns only specified components",
      multiComponentResponse.data.every((log) =>
        ["database", "api"].includes(log.component!),
      ),
    );
  }
  // Test that different filters return different results (when data exists)
  if (
    singleComponentResponse.data.length > 0 &&
    multiComponentResponse.data.length > 0
  ) {
    TestValidator.notEquals(
      "different component filters return different results",
      singleComponentResponse.data.length,
      multiComponentResponse.data.length,
    );
  }
}
