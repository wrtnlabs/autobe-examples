import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_refresh_incorrect_content_type(
  connection: api.IConnection,
) {
  // Test with invalid Content-Type: text/plain
  const invalidConn: api.IConnection = {
    ...connection,
    headers: { "Content-Type": "text/plain" },
  };
  await TestValidator.error(
    "text/plain Content-Type should be rejected with 415",
    async () => {
      await api.functional.auth.moderator.refresh(invalidConn, {
        body: {
          refresh_token: typia.random<string>(),
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );

  // Test with invalid Content-Type: application/xml
  const xmlConn: api.IConnection = {
    ...connection,
    headers: { "Content-Type": "application/xml" },
  };
  await TestValidator.error(
    "application/xml Content-Type should be rejected with 415",
    async () => {
      await api.functional.auth.moderator.refresh(xmlConn, {
        body: {
          refresh_token: typia.random<string>(),
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );

  // Test with invalid Content-Type: text/html
  const htmlConn: api.IConnection = {
    ...connection,
    headers: { "Content-Type": "text/html" },
  };
  await TestValidator.error(
    "text/html Content-Type should be rejected with 415",
    async () => {
      await api.functional.auth.moderator.refresh(htmlConn, {
        body: {
          refresh_token: typia.random<string>(),
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );

  // Test with invalid Content-Type: application/octet-stream
  const octetConn: api.IConnection = {
    ...connection,
    headers: { "Content-Type": "application/octet-stream" },
  };
  await TestValidator.error(
    "application/octet-stream Content-Type should be rejected with 415",
    async () => {
      await api.functional.auth.moderator.refresh(octetConn, {
        body: {
          refresh_token: typia.random<string>(),
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );

  // Test with invalid Content-Type: application/json with wrong case
  const wrongCaseConn: api.IConnection = {
    ...connection,
    headers: { "Content-Type": "APPLICATION/JSON" },
  };
  await TestValidator.error(
    "APPLICATION/JSON Content-Type (wrong case) should be rejected with 415",
    async () => {
      await api.functional.auth.moderator.refresh(wrongCaseConn, {
        body: {
          refresh_token: typia.random<string>(),
        } satisfies IPoliticalForumModerator.IRefresh,
      });
    },
  );
}
