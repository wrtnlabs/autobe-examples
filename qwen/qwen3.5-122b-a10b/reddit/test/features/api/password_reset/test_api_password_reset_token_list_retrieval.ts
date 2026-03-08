import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMemberPasswordReset";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_token_list_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Retrieve password reset token list with default pagination
  const result: IPageIRedditPlatformMemberPasswordReset =
    await api.functional.redditPlatform.member.password_resets.index(
      memberConnection,
      {
        body: {} satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(result);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current is number",
    typeof result.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit is number",
    typeof result.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records is number",
    typeof result.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages is number",
    typeof result.pagination.pages,
    "number",
  );
  TestValidator.predicate(
    "records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    result.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.equals("data is array", Array.isArray(result.data), true);
  // 5. If tokens exist, validate at least one token has required structure
  if (result.data.length > 0) {
    const token = result.data[0];
    // typia.assert above already validates all properties, just verify it's a valid object
    TestValidator.predicate(
      "token is object",
      typeof token === "object" && token !== null,
    );
  }
}