import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsVisitor";

export async function test_api_visitor_join_temporary_session(
  connection: api.IConnection,
) {
  // 1) Prepare realistic visitor create payload
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const userAgent = `Mozilla/5.0 (compatible; TestBot/${RandomGenerator.alphaNumeric(6)})`;
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  const createBody = {
    ip,
    user_agent: userAgent,
    session_context: {
      href,
      referrer,
      session_ttl_seconds: 3600,
    },
  } satisfies ICommunityBbsVisitor.ICreate;

  // 2) First join call: create visitor + session and receive tokens
  const first: ICommunityBbsVisitor.IAuthorized =
    await api.functional.auth.visitor.join(connection, {
      body: createBody,
    });
  // Validate response shape and types
  typia.assert(first);

  // Basic presence checks using TestValidator
  TestValidator.predicate(
    "visitor join returns id",
    typeof first.id === "string" && first.id.length > 0,
  );
  TestValidator.predicate(
    "visitor join returns session id",
    typeof first.session_id === "string" && first.session_id.length > 0,
  );
  TestValidator.predicate(
    "visitor join returns token object",
    typeof first.token === "object" && first.token !== null,
  );

  // Token string presence
  TestValidator.predicate(
    "access token present",
    typeof first.token.access === "string" && first.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token present",
    typeof first.token.refresh === "string" && first.token.refresh.length > 0,
  );

  // Token timestamps parseable
  TestValidator.predicate(
    "access token expired_at is valid date-time",
    !Number.isNaN(Date.parse(first.token.expired_at)),
  );
  TestValidator.predicate(
    "refresh token refreshable_until is valid date-time",
    !Number.isNaN(Date.parse(first.token.refreshable_until)),
  );

  // first.last_seen_at and first.first_seen_at should be parseable if provided
  if (first.last_seen_at !== undefined) {
    TestValidator.predicate(
      "first.last_seen_at parseable",
      !Number.isNaN(Date.parse(first.last_seen_at)),
    );
  }
  if (first.first_seen_at !== undefined) {
    TestValidator.predicate(
      "first.first_seen_at parseable",
      !Number.isNaN(Date.parse(first.first_seen_at)),
    );
  }

  // 3) Re-run join using the same ip/user_agent to assert upsert behavior
  const createBody2 = {
    ip,
    user_agent: userAgent,
    session_context: {
      href: typia.random<string & tags.Format<"uri">>(), // different href for a new session
      referrer: typia.random<string & tags.Format<"uri">>(),
      session_ttl_seconds: 1800,
    },
  } satisfies ICommunityBbsVisitor.ICreate;

  const second: ICommunityBbsVisitor.IAuthorized =
    await api.functional.auth.visitor.join(connection, {
      body: createBody2,
    });
  typia.assert(second);

  // Business validations
  TestValidator.equals(
    "visitor id remains same for same fingerprint",
    first.id,
    second.id,
  );
  TestValidator.notEquals(
    "session id should be new for second join",
    first.session_id,
    second.session_id,
  );

  // last_seen_at should be updated (if provided by API). Compare timestamps when available.
  if (first.last_seen_at !== undefined && second.last_seen_at !== undefined) {
    const firstLast = Date.parse(first.last_seen_at);
    const secondLast = Date.parse(second.last_seen_at);
    TestValidator.predicate(
      "second.last_seen_at is same or after first.last_seen_at",
      secondLast >= firstLast,
    );
  }

  // Validate that the returned session_id and visitor id correlate: presence check done above.
  TestValidator.predicate(
    "second token.access present",
    typeof second.token.access === "string" && second.token.access.length > 0,
  );
  TestValidator.predicate(
    "second token.refresh present",
    typeof second.token.refresh === "string" && second.token.refresh.length > 0,
  );

  // End of scenario: We cannot directly query the DB in this environment, so
  // we validate persistence semantics via API responses only (id stability,
  // session growth, and timestamp updates).
}
