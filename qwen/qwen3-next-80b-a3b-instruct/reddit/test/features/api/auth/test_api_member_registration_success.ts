import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_member_registration_success(
  connection: api.IConnection,
) {
  const email: string = typia.random<
    string & tags.MinLength<5> & tags.MaxLength<254> & tags.Format<"email">
  >();
  const username: string = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const password: string = typia.random<
    string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$">
  >();

  const output: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        username,
        password,
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(output);
}
