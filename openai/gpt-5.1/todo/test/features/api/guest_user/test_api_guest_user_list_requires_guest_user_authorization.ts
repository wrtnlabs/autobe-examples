import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuestuser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";
import type { ITodoAppGuestUserMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUserMetadata";

export async function test_api_guest_user_list_requires_guest_user_authorization(
  connection: api.IConnection,
) {
  // 1. Prepare a simple, valid IRequest body. All fields are optional; we
  //    only set a small positive limit to exercise pagination behavior.
  const requestBody = {
    page: 1,
    limit: 5,
  } satisfies ITodoAppGuestUser.IRequest;

  // 2. Unauthorized access attempt: clone the existing connection but drop
  //    any Authorization header by providing an empty headers object.
  //    Per global rules we are allowed to construct a fresh connection
  //    object but must not otherwise manipulate headers in-place.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "guest user list should reject unauthenticated access",
    async () => {
      await api.functional.todoApp.guestUser.guestUsers.index(
        unauthenticatedConnection,
        { body: requestBody },
      );
    },
  );

  // 3. Authenticate as guestUser using the join endpoint. This will both
  //    create/resolve a guest identity and attach a valid Authorization
  //    header into the shared `connection` object.
  const joinBody = {
    display_name: RandomGenerator.name(1),
  } satisfies ITodoAppGuestUser.IJoin;

  const authorizedGuest = await api.functional.auth.guestUser.join(connection, {
    body: joinBody,
  });
  typia.assert<ITodoAppGuestUser.IAuthorized>(authorizedGuest);

  // 4. Authorized access: call the guest user listing endpoint with the
  //    authenticated connection. This should now succeed and return a
  //    paginated summary page.
  const page = await api.functional.todoApp.guestUser.guestUsers.index(
    connection,
    { body: requestBody },
  );
  typia.assert<IPageITodoAppGuestuser.ISummary>(page);

  // 5. Basic business validations on the successful result. We do not
  //    re-validate types (typia.assert already guarantees them), but we can
  //    validate simple logical invariants.
  TestValidator.predicate(
    "pagination current page should be non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    page.pagination.limit >= 0,
  );

  // If there is at least one guest summary, ensure that core fields are
  // present and well-formed by relying on TypeScript types and typia.assert
  // (already executed). We can still check simple business logic like
  // created_at being a non-empty string.
  if (page.data.length > 0) {
    const first = page.data[0];
    TestValidator.predicate(
      "guest summary id should be a non-empty string",
      first.id.length > 0,
    );
    TestValidator.predicate(
      "guest summary created_at should be a non-empty string",
      first.created_at.length > 0,
    );
  }
}
