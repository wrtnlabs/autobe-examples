import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_join_success_immediate_session(
  connection: api.IConnection,
): Promise<void> {
  // Create a new member connection using the authorize_member_join utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  // Validate the complete response structure using typia.assert
  // This performs comprehensive validation including all type checks, format validations, and constraints
  typia.assert(authorizedMember);
  // Test business logic aspects - focus on what matters for the scenario
  TestValidator.predicate(
    "member has valid display name",
    authorizedMember.display_name.length > 0,
  );
  TestValidator.predicate(
    "member is not soft-deleted",
    authorizedMember.deleted_at === undefined ||
      authorizedMember.deleted_at === null,
  );
  TestValidator.predicate(
    "authentication tokens are generated",
    authorizedMember.token.access.length > 0 &&
      authorizedMember.token.refresh.length > 0,
  );
  // Verify that the member can be immediately authenticated for todo operations
  // by checking that the connection headers are properly set with the access token
  TestValidator.predicate(
    "connection headers contain authorization token",
    memberConnection.headers?.Authorization !== undefined &&
      typeof memberConnection.headers.Authorization === "string" &&
      memberConnection.headers.Authorization.length > 0,
  );
}