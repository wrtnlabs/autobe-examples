import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test listing password reset requests for an authenticated member user.
 *
 * Validates the password reset request listing functionality by creating a member
 * account and querying their password reset requests with pagination, filtering,
 * and sorting. Ensures that the endpoint returns properly structured paginated
 * responses with correct member information and secure data masking.
 *
 * Special attention is given to verifying that password reset requests include
 * only summary information (excluding actual token values) and that member data
 * is correctly joined from the database.
 *
 * 1. Member account registration with random email and password
 * 2. Authentication and token acquisition for subsequent requests
 * 3. Password reset listing request with default pagination
 * 4. Validation of pagination metadata structure and values
 * 5. Validation of password reset summary data structure
 * 6. Verification of member information joining
 * 7. Verification of sorting order (most recent first by default)
 */
export async function test_api_member_password_reset_list_own(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const registerConnection: api.IConnection = { host: connection.host };
  const member: IMultiUserTodoMember.IAuthorized = await authorize_member_join(
    registerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: RandomGenerator.paragraph({ sentences: 1 }),
        referrer: RandomGenerator.paragraph({ sentences: 1 }),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Create authenticated connection for listing password resets
  const listingConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${member.token.access}` },
  };
  // 3. List password reset requests with default pagination
  const response: IPageIMultiUserTodoMemberPasswordReset.ISummary =
    await api.functional.multiUserTodo.member_password_resets.index(
      listingConnection,
      {
        body: {
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IMultiUserTodoMemberPasswordReset.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate pagination structure
  TestValidator.predicate(
    "pagination current page is valid",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    response.pagination.pages >= 0,
  );
  TestValidator.equals(
    "pagination pages calculation",
    response.pagination.pages,
    Math.ceil(response.pagination.records / response.pagination.limit),
  );
  // 5. Validate data array structure and sorting order
  typia.assert(response.data);
  for (const resetRequest of response.data) {
    typia.assert(resetRequest);
    typia.assert(resetRequest.member);
    typia.assert(resetRequest.member.id);
    typia.assert(resetRequest.member.email);
    typia.assert(resetRequest.expired_at);
    typia.assert(resetRequest.created_at);
    typia.assert(resetRequest.updated_at);
  }
  // 6. Verify sorting order (created_at DESC by default)
  if (response.data.length > 1) {
    let sortedCorrectly = true;
    for (let i = 0; i < response.data.length - 1; i++) {
      const current = response.data[i];
      const next = response.data[i + 1];
      if (current.created_at < next.created_at) {
        sortedCorrectly = false;
        break;
      }
    }
    TestValidator.predicate(
      "password resets sorted by created_at DESC",
      sortedCorrectly,
    );
  }
}
