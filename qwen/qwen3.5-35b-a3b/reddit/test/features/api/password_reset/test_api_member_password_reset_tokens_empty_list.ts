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

export async function test_api_member_password_reset_tokens_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a fresh member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. List password reset tokens for the fresh account
  //    (no tokens should exist yet)
  const response: IPageIRedditPlatformMemberPasswordReset.ISummary =
    await api.functional.redditPlatform.member.password_resets.index(
      memberConnection,
      {
        body: {} satisfies IRedditPlatformMemberPasswordReset.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate empty response structure
  TestValidator.equals("empty items array", response.data.length, 0);
  TestValidator.equals("records count is zero", response.pagination.records, 0);
  TestValidator.equals("pages count is zero", response.pagination.pages, 0);
  TestValidator.equals("current page is 1", response.pagination.current, 1);
}