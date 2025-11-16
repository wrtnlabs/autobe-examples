import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_token_validation_expired_token(
  connection: api.IConnection,
) {
  // Create a moderator account to establish JWT token structure
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<30> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      password: RandomGenerator.alphabets(12),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Extract the access token from the authorized response
  const accessToken = moderator.token.access;
  typia.assert<string>(accessToken);

  // Create an expired token by manipulating the JWT
  // The expired token is constructed by decoding the valid token,
  // modifying the exp claim to a past timestamp, and encoding it back
  const tokenParts = accessToken.split(".");
  if (tokenParts.length !== 3) {
    throw new Error("Invalid JWT token format");
  }

  // Decode the payload (second part of JWT)
  const payloadJson = JSON.parse(
    Buffer.from(tokenParts[1], "base64").toString("utf-8"),
  );

  // Set expiration to a past date (1 hour ago)
  const now = Math.floor(Date.now() / 1000);
  payloadJson.exp = now - 3600;

  // Encode the modified payload
  const modifiedPayload = Buffer.from(JSON.stringify(payloadJson)).toString(
    "base64",
  );

  // Reconstruct the token with the expired claim
  // Note: In a real scenario, the signature would be invalid, but for testing
  // we're simulating an expired token structure
  const expiredToken = `${tokenParts[0]}.${modifiedPayload}.${tokenParts[2]}`;

  // Validate the expired token
  const validationResult =
    await api.functional.discussionBoard.moderator.auth.moderator.validate_token.validateToken(
      connection,
      {
        body: {
          token: expiredToken,
        } satisfies IDiscussionBoardModerator.IValidateToken,
      },
    );
  typia.assert(validationResult);

  // Verify that the expired token is marked as invalid
  TestValidator.equals(
    "expired token should be marked invalid",
    validationResult.is_valid,
    false,
  );

  // Verify that moderator details are null when token is invalid
  TestValidator.predicate(
    "moderator_id should be null for expired token",
    validationResult.moderator_id === null ||
      validationResult.moderator_id === undefined,
  );

  TestValidator.predicate(
    "username should be null for expired token",
    validationResult.username === null ||
      validationResult.username === undefined,
  );

  TestValidator.predicate(
    "display_name should be null for expired token",
    validationResult.display_name === null ||
      validationResult.display_name === undefined,
  );

  TestValidator.predicate(
    "email should be null for expired token",
    validationResult.email === null || validationResult.email === undefined,
  );

  // Verify that role is still populated as 'moderator'
  TestValidator.equals(
    "role should remain moderator",
    validationResult.role,
    "moderator",
  );
}
