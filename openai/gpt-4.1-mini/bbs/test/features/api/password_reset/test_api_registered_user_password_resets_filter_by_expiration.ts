import api from "@ORGANIZATION/PROJECT-api";
import type { IConnection } from "@nestia/fetcher";
import typia from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { TestValidator } from "@nestia/e2e";

export async function test_api_registered_user_password_resets_filter_by_expiration(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const registeredUserConnection: api.IConnection = { host: connection.host };
  await authorize_registered_user_join(registeredUserConnection, { body: {} });
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, { body: {} });
  const superAdministratorConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdministratorConnection, { body: {} });

  // Prepare request bodies for expired and non-expired filtering
  const expiredTrueBody = { expired: true };
  const expiredFalseBody = { expired: false };

  // Test as administrator: expired = true
  const expiredTrueResponse = typia.assert(await api.functional.discussionBoard.registeredUser.passwordResets.index(
    administratorConnection,
    { body: expiredTrueBody },
  ));
  TestValidator.predicate(
    "admin expired=true pagination current page >= 1",
    expiredTrueResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "admin expired=true pagination limit > 0",
    expiredTrueResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "admin expired=true pagination records >= data length",
    expiredTrueResponse.pagination.records >= expiredTrueResponse.data.length,
  );
  TestValidator.predicate(
    "admin expired=true pagination pages consistent",
    expiredTrueResponse.pagination.pages ===
      Math.ceil(
        expiredTrueResponse.pagination.records / expiredTrueResponse.pagination.limit,
      ),
  );
  expiredTrueResponse.data.forEach((token: any) => {
    const expiredAt = new Date(token.expired_at).getTime();
    TestValidator.predicate("admin token is expired", expiredAt <= Date.now());
  });

  // Test as administrator: expired = false
  const expiredFalseResponse = typia.assert(await api.functional.discussionBoard.registeredUser.passwordResets.index(
    administratorConnection,
    { body: expiredFalseBody },
  ));
  TestValidator.predicate(
    "admin expired=false pagination current page >= 1",
    expiredFalseResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "admin expired=false pagination limit > 0",
    expiredFalseResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "admin expired=false pagination records >= data length",
    expiredFalseResponse.pagination.records >= expiredFalseResponse.data.length,
  );
  TestValidator.predicate(
    "admin expired=false pagination pages consistent",
    expiredFalseResponse.pagination.pages ===
      Math.ceil(
        expiredFalseResponse.pagination.records / expiredFalseResponse.pagination.limit,
      ),
  );
  expiredFalseResponse.data.forEach((token: any) => {
    const expiredAt = new Date(token.expired_at).getTime();
    TestValidator.predicate("admin token is not expired", expiredAt > Date.now());
  });

  // Test as super administrator: expired = true
  const supExpiredTrueResponse = typia.assert(await api.functional.discussionBoard.registeredUser.passwordResets.index(
    superAdministratorConnection,
    { body: expiredTrueBody },
  ));
  TestValidator.predicate(
    "super admin expired=true pagination current page >= 1",
    supExpiredTrueResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "super admin expired=true pagination limit > 0",
    supExpiredTrueResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "super admin expired=true pagination records >= data length",
    supExpiredTrueResponse.pagination.records >= supExpiredTrueResponse.data.length,
  );
  TestValidator.predicate(
    "super admin expired=true pagination pages consistent",
    supExpiredTrueResponse.pagination.pages ===
      Math.ceil(
        supExpiredTrueResponse.pagination.records / supExpiredTrueResponse.pagination.limit,
      ),
  );
  supExpiredTrueResponse.data.forEach((token: any) => {
    const expiredAt = new Date(token.expired_at).getTime();
    TestValidator.predicate("super admin token is expired", expiredAt <= Date.now());
  });

  // Test as super administrator: expired = false
  const supExpiredFalseResponse = typia.assert(await api.functional.discussionBoard.registeredUser.passwordResets.index(
    superAdministratorConnection,
    { body: expiredFalseBody },
  ));
  TestValidator.predicate(
    "super admin expired=false pagination current page >= 1",
    supExpiredFalseResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "super admin expired=false pagination limit > 0",
    supExpiredFalseResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "super admin expired=false pagination records >= data length",
    supExpiredFalseResponse.pagination.records >= supExpiredFalseResponse.data.length,
  );
  TestValidator.predicate(
    "super admin expired=false pagination pages consistent",
    supExpiredFalseResponse.pagination.pages ===
      Math.ceil(
        supExpiredFalseResponse.pagination.records / supExpiredFalseResponse.pagination.limit,
      ),
  );
  supExpiredFalseResponse.data.forEach((token: any) => {
    const expiredAt = new Date(token.expired_at).getTime();
    TestValidator.predicate("super admin token is not expired", expiredAt > Date.now());
  });

  // Test as registered user (unauthorized): expect error
  await TestValidator.error(
    "registered user unauthorized access to passwordResets.index",
    async () => {
      await api.functional.discussionBoard.registeredUser.passwordResets.index(
        registeredUserConnection,
        { body: {} },
      );
    },
  );
}
