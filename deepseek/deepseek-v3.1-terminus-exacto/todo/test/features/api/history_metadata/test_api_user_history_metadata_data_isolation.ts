import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppHistoryMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppHistoryMetadatum";
import type { ITodoAppHistoryMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppHistoryMetadatum";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_history_metadata_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // Create first user connection
  const user1Connection: api.IConnection = { host: connection.host };
  const user1Auth = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(user1Auth);
  // Create second user connection
  const user2Connection: api.IConnection = { host: connection.host };
  const user2Auth = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(user2Auth);
  // Prepare history metadata request
  const requestBody = {
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies ITodoAppHistoryMetadatum.IRequest;
  // Get history metadata as User1
  const user1Result = await api.functional.todoApp.user.history_metadata.index(
    user1Connection,
    { body: requestBody },
  );
  typia.assert(user1Result);
  // Get history metadata as User2
  const user2Result = await api.functional.todoApp.user.history_metadata.index(
    user2Connection,
    { body: requestBody },
  );
  typia.assert(user2Result);
  // Verify both users receive the same system configuration data
  TestValidator.equals(
    "history metadata should be identical for all authenticated users",
    user1Result,
    user2Result,
  );
  // Test unauthorized access - connection without authentication
  await TestValidator.error(
    "unauthenticated access should be rejected",
    async () => {
      const unauthenticatedConnection: api.IConnection = {
        host: connection.host,
      };
      await api.functional.todoApp.user.history_metadata.index(
        unauthenticatedConnection,
        { body: requestBody },
      );
    },
  );
}
