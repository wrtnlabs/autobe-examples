import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunitySystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunitySystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunitySystemMessage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_messages_published_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Call the published messages filter endpoint
  const response =
    await api.functional.community.admin.system_messages.index(adminConnection);
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals("pagination current", response.pagination.current, 1);
  TestValidator.equals("pagination limit", response.pagination.limit, 20); // Default limit, assumed by framework
  TestValidator.equals(
    "pagination records",
    response.pagination.records,
    response.data.length,
  );
  TestValidator.equals(
    "pagination pages",
    response.pagination.pages,
    Math.ceil(response.data.length / 20),
  );
  // Validate data array exists and is of correct type (empty objects)
  // Since ICommunitySystemMessage.ISummary is empty, no field validation is possible
  // We can only validate that data array exists and pagination is consistent
  TestValidator.predicate(
    "data array is defined",
    Array.isArray(response.data),
  );
}
