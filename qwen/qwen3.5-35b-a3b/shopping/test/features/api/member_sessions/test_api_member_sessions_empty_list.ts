import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_sessions_empty_list(
  connection: api.IConnection,
): Promise<void> {
  // Create a member account via join (creates initial session)
  const joinConnection: api.IConnection = { host: connection.host };
  const member: IEcommerceMallMember.IAuthorized = await authorize_member_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // Create authenticated connection with member token
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: member.token.access,
  };
  // List sessions with filter that results in empty list
  // Filter by actor_type="seller" for a member account
  const response: IPageIEcommerceMallGuestSession.ISummary =
    await api.functional.ecommerceMall.member.sessions.index(
      authenticatedConnection,
      {
        body: {
          actor_type: "seller",
          limit: 20,
        },
      },
    );
  typia.assert(response);
  // Validate pagination metadata for empty result set
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination total records for empty list",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination total pages for empty list",
    response.pagination.pages,
    0,
  );
  // Validate empty data array
  TestValidator.equals("data array is empty", response.data.length, 0);
  TestValidator.predicate(
    "data array is proper array",
    Array.isArray(response.data),
  );
}
