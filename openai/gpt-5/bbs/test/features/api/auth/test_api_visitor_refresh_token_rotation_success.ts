import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVisitor";
import type { IEconDiscussVisitorJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVisitorJoin";
import type { IEconDiscussVisitorRefresh } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussVisitorRefresh";

export async function test_api_visitor_refresh_token_rotation_success(
  connection: api.IConnection,
) {
  // 1) Register a new Visitor to obtain initial tokens
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussVisitorJoin.ICreate;

  const authorized1: IEconDiscussVisitor.IAuthorized =
    await api.functional.auth.visitor.join(connection, { body: joinBody });
  typia.assert(authorized1);

  const firstAccess: string = authorized1.token.access;
  const firstRefresh: string = authorized1.token.refresh;

  // 2) Refresh using the issued refresh token
  const refreshBody1 = {
    refresh_token: firstRefresh,
  } satisfies IEconDiscussVisitorRefresh.IRequest;

  const authorized2: IEconDiscussVisitor.IAuthorized =
    await api.functional.auth.visitor.refresh(connection, {
      body: refreshBody1,
    });
  typia.assert(authorized2);

  const simulated: boolean = connection.simulate === true;

  if (!simulated) {
    // Identity must be preserved
    TestValidator.equals(
      "visitor id preserved after refresh",
      authorized2.id,
      authorized1.id,
    );
    // Rotation policy: access and refresh tokens should change
    TestValidator.notEquals(
      "access token must be rotated on refresh",
      authorized2.token.access,
      firstAccess,
    );
    TestValidator.notEquals(
      "refresh token must be rotated on refresh",
      authorized2.token.refresh,
      firstRefresh,
    );
  }

  // 3) Optional: perform another refresh using the rotated refresh token
  const refreshBody2 = {
    refresh_token: authorized2.token.refresh,
  } satisfies IEconDiscussVisitorRefresh.IRequest;

  const authorized3: IEconDiscussVisitor.IAuthorized =
    await api.functional.auth.visitor.refresh(connection, {
      body: refreshBody2,
    });
  typia.assert(authorized3);

  if (!simulated) {
    TestValidator.equals(
      "visitor id preserved after second refresh",
      authorized3.id,
      authorized1.id,
    );
    TestValidator.notEquals(
      "second refresh rotates access token again",
      authorized3.token.access,
      authorized2.token.access,
    );
    TestValidator.notEquals(
      "second refresh rotates refresh token again",
      authorized3.token.refresh,
      authorized2.token.refresh,
    );
  }
}
