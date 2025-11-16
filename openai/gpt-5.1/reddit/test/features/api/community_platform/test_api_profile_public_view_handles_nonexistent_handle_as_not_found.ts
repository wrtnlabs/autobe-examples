import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUserProfilePublicView } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfilePublicView";

/**
 * Verify that public profile view returns a not-found style HTTP error for
 * non-existent or invalid handles, without leaking existence or deletion
 * details.
 *
 * Business rationale:
 *
 * - Public profile URLs are keyed by human-readable `handle` values.
 * - When a handle does not map to any visible profile (non-existent,
 *   soft-deleted, or made private), the platform must respond with a generic
 *   not-found style error rather than indicating which case is true.
 * - This prevents user enumeration and leaking of internal lifecycle state while
 *   still giving clients a clear failure signal.
 *
 * Test steps:
 *
 * 1. Construct an unauthenticated connection derived from the provided
 *    `connection`, with empty headers object, without mutating the original
 *    connection.
 * 2. Generate a synthetic handle that is extremely unlikely to exist, such as a
 *    fixed prefix plus a long random alpha-numeric suffix.
 * 3. Call api.functional.communityPlatform.profiles.publicView.at with this handle
 *    using the unauthenticated connection.
 * 4. Use TestValidator.httpError to assert that the call fails with a 404-style
 *    not-found HttpError. Do not attempt to validate the error body structure
 *    beyond the status code; rely solely on the HttpError wrapper.
 * 5. Optionally, generate a second handle that intentionally looks invalid or
 *    reserved (e.g., containing characters that are unlikely to be allowed by
 *    handle validation rules) and again call the endpoint, asserting that a 4xx
 *    HttpError is thrown (400 or 404) using TestValidator.httpError.
 * 6. At no point should the test attempt to distinguish whether the handle was
 *    never used, soft-deleted, or made private; the only observable is the
 *    not-found/validation-style HTTP status.
 */
export async function test_api_profile_public_view_handles_nonexistent_handle_as_not_found(
  connection: api.IConnection,
) {
  // Step 1: derive unauthenticated connection with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 2: generate a synthetic, virtually guaranteed-nonexistent handle
  const randomSuffix: string = RandomGenerator.alphaNumeric(32);
  const nonexistentHandle: string = `nonexistent-test-handle-${randomSuffix}`;

  // Step 3 & 4: expect 404-style not-found when requesting publicView
  await TestValidator.httpError(
    "nonexistent handle should result in 404 not-found when fetching public profile publicView",
    404,
    async () => {
      await api.functional.communityPlatform.profiles.publicView.at(
        unauthenticatedConnection,
        {
          handle: nonexistentHandle,
        },
      );
    },
  );

  // Step 5 (optional): invalid/reserved-looking handle should still be 4xx
  const invalidHandle: string = "@@invalid__handle__reserved@@";

  await TestValidator.httpError(
    "invalid-format handle should result in client error (400 or 404) when fetching public profile publicView",
    [400, 404],
    async () => {
      await api.functional.communityPlatform.profiles.publicView.at(
        unauthenticatedConnection,
        {
          handle: invalidHandle,
        },
      );
    },
  );
}
