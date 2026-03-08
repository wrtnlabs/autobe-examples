import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_profile_auto_created(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first user with full profile data
  const connection1: api.IConnection = { host: connection.host };
  const firstUser = await authorize_member_join(connection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
      ip: "127.0.0.1",
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(firstUser);
  // Verify first user registration response has valid structure
  TestValidator.equals("first user id is uuid", firstUser.id, "uuid format");
  TestValidator.predicate(
    "first user has access token",
    firstUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "first user has refresh token",
    firstUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "first user token has expiration",
    firstUser.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "first user token has refreshable until",
    firstUser.token.refreshable_until !== undefined,
  );
  // 2. Register second user with empty bio
  const connection2: api.IConnection = { host: connection.host };
  const secondUser = await authorize_member_join(connection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: "",
      href: "https://example.com/register",
      referrer: "https://example.com/home",
      ip: "127.0.0.1",
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(secondUser);
  // Verify second user registration response
  TestValidator.equals("second user id is uuid", secondUser.id, "uuid format");
  TestValidator.predicate(
    "second user has access token",
    secondUser.token.access.length > 0,
  );
  // 3. Register third user without bio field (omit bio)
  const connection3: api.IConnection = { host: connection.host };
  const thirdUser = await authorize_member_join(connection3, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
      ip: "127.0.0.1",
    } satisfies DeepPartial<IEconomicPoliticalBoardMember.IJoin>,
  });
  typia.assert(thirdUser);
  // Verify third user registration response
  TestValidator.equals("third user id is uuid", thirdUser.id, "uuid format");
  TestValidator.predicate(
    "third user has access token",
    thirdUser.token.access.length > 0,
  );
  // 4. Verify all users have unique IDs
  TestValidator.notEquals(
    "first and second user IDs differ",
    firstUser.id,
    secondUser.id,
  );
  TestValidator.notEquals(
    "first and third user IDs differ",
    firstUser.id,
    thirdUser.id,
  );
  TestValidator.notEquals(
    "second and third user IDs differ",
    secondUser.id,
    thirdUser.id,
  );
  // 5. Verify token expiration timestamps are valid date-time format
  typia.assert(firstUser.token.expired_at);
  typia.assert(secondUser.token.expired_at);
  typia.assert(thirdUser.token.expired_at);
  typia.assert(firstUser.token.refreshable_until);
  typia.assert(secondUser.token.refreshable_until);
  typia.assert(thirdUser.token.refreshable_until);
  // 6. Verify access token expiration is before refreshable until
  const firstExpired = new Date(firstUser.token.expired_at);
  const firstRefreshable = new Date(firstUser.token.refreshable_until);
  TestValidator.predicate(
    "access token expires before refreshable until",
    firstExpired.getTime() <= firstRefreshable.getTime(),
  );
}