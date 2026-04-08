import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // 1. Prepare join input
  const joinInput: IRedditCommunityMember.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  };
  // 2. Register new member with valid credentials
  const response = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(response);
  // 3. Verify response structure and fields
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f-]{36}$/i.test(response.id),
  );
  TestValidator.equals(
    "response email matches input",
    response.email,
    joinInput.email,
  );
  TestValidator.equals(
    "response username matches input",
    response.username,
    joinInput.username,
  );
  TestValidator.equals(
    "response has created_at",
    typeof response.created_at,
    "string",
  );
  TestValidator.equals(
    "response has updated_at",
    typeof response.updated_at,
    "string",
  );
  TestValidator.equals(
    "response deleted_at is null",
    response.deleted_at,
    null,
  );
  // 4. Verify token structure
  TestValidator.equals(
    "token has access",
    typeof response.token.access,
    "string",
  );
  TestValidator.equals(
    "token has refresh",
    typeof response.token.refresh,
    "string",
  );
  TestValidator.predicate(
    "token has expired_at",
    response.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "token has refreshable_until",
    response.token.refreshable_until !== undefined,
  );
  // 5. Verify timestamps are ISO 8601 formatted
  const createdDate = new Date(response.created_at);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(createdDate.getTime()),
  );
  const updatedDate = new Date(response.updated_at);
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(updatedDate.getTime()),
  );
  const expiredDate = new Date(response.token.expired_at);
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(expiredDate.getTime()),
  );
  const refreshableDate = new Date(response.token.refreshable_until);
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(refreshableDate.getTime()),
  );
  // 6. Verify access token expires before refreshable_until
  TestValidator.predicate(
    "expired_at is before refreshable_until",
    new Date(response.token.expired_at) <
      new Date(response.token.refreshable_until),
  );
  // 7. Verify account creation timestamps are equal or updated_at slightly after created_at
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedDate >= createdDate,
  );
  // 8. Verify response timestamps are recent (within last hour)
  const oneHourAgo = new Date(Date.now() - 3600000);
  TestValidator.predicate("created_at is recent", createdDate >= oneHourAgo);
  TestValidator.predicate("updated_at is recent", updatedDate >= oneHourAgo);
  TestValidator.predicate(
    "expired_at is in the future",
    expiredDate > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    refreshableDate > new Date(),
  );
}
