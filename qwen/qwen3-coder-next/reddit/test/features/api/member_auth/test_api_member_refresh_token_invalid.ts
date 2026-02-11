import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_refresh_token_invalid(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Invalid refresh token format
  try {
    await api.functional.redditPlatform.auth.member.refresh(connection, {
      body: {
        refresh_token: "invalid-token-format",
        ip: "192.168.1.1",
        href: "/test",
        referrer: "https://example.com",
      } satisfies IRedditPlatformMember.IRefresh,
    });
    throw new Error("Expected error for invalid token format");
  } catch (exp) {
    if (!typia.is<api.HttpError>(exp)) throw exp;
    TestValidator.equals(
      "invalid token returns error",
      exp.status >= 400 && exp.status < 500,
      true,
    );
  }
  // Test 2: Non-existent refresh token
  try {
    await api.functional.redditPlatform.auth.member.refresh(connection, {
      body: {
        refresh_token: "nonexistent-token-12345678-1234-1234-1234-123456789012",
        ip: "192.168.1.1",
        href: "/test",
        referrer: "https://example.com",
      } satisfies IRedditPlatformMember.IRefresh,
    });
    throw new Error("Expected error for non-existent token");
  } catch (exp) {
    if (!typia.is<api.HttpError>(exp)) throw exp;
    TestValidator.equals(
      "non-existent token returns error",
      exp.status >= 400 && exp.status < 500,
      true,
    );
  }
  // Test 3: Tampered/modified refresh token
  try {
    const validToken = typia.random<string & tags.Format<"uuid">>();
    const tamperedToken =
      validToken.substring(0, 20) + "modified" + validToken.substring(30);
    await api.functional.redditPlatform.auth.member.refresh(connection, {
      body: {
        refresh_token: tamperedToken,
        ip: "192.168.1.1",
        href: "/test",
        referrer: "https://example.com",
      } satisfies IRedditPlatformMember.IRefresh,
    });
    throw new Error("Expected error for tampered token");
  } catch (exp) {
    if (!typia.is<api.HttpError>(exp)) throw exp;
    TestValidator.equals(
      "tampered token returns error",
      exp.status >= 400 && exp.status < 500,
      true,
    );
  }
  // Test 4: Empty refresh token
  try {
    await api.functional.redditPlatform.auth.member.refresh(connection, {
      body: {
        refresh_token: "",
        ip: "192.168.1.1",
        href: "/test",
        referrer: "https://example.com",
      } satisfies IRedditPlatformMember.IRefresh,
    });
    throw new Error("Expected error for empty token");
  } catch (exp) {
    if (!typia.is<api.HttpError>(exp)) throw exp;
    TestValidator.equals(
      "empty token returns error",
      exp.status >= 400 && exp.status < 500,
      true,
    );
  }
}
