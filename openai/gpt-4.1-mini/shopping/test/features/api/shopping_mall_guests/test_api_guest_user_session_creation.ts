import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";

/**
 * Test creating a new guest user session for tracking an unauthenticated
 * visitor. Validate that the session token is unique and returned data contains
 * expected properties such as timestamps. No authentication is required for
 * this public endpoint. Verify that multiple guest sessions can be created
 * without session token conflicts. Confirm proper handling of optional IP
 * address and user agent information when provided and ensure correct data is
 * stored and retrievable.
 */
export async function test_api_guest_user_session_creation(
  connection: api.IConnection,
) {
  // Array to store created session tokens for uniqueness checks
  const sessionTokens = new Set<string>();

  for (let i = 0; i < 5; ++i) {
    // Create a base guest session token
    const sessionToken = `${RandomGenerator.alphaNumeric(8)}-${typia.random<string & tags.Format<"uuid">>()}`;

    // Generate a realistic IPv4 address
    const ip_address =
      Math.random() > 0.5
        ? `${RandomGenerator.pick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255])}.${RandomGenerator.pick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255])}.${RandomGenerator.pick([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255])}`
        : null;

    // Generate a realistic user agent string
    const user_agent =
      Math.random() > 0.5
        ? `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${RandomGenerator.pick([90, 91, 92, 93, 94, 95, 96])}.0.${RandomGenerator.pick([4000, 4500, 5000])}.${RandomGenerator.pick([0, 1, 2, 3, 4, 5])} Safari/537.36`
        : null;

    // Prepare request body
    const requestBody = {
      session_token: sessionToken,
      ip_address: ip_address,
      user_agent: user_agent,
    } satisfies IShoppingMallGuest.ICreate;

    // Call the create API
    const guest: IShoppingMallGuest =
      await api.functional.shoppingMall.guests.create(connection, {
        body: requestBody,
      });
    typia.assert(guest);

    // Validate key response properties
    TestValidator.predicate(
      "created guest has non-empty id",
      typeof guest.id === "string" && guest.id.length > 0,
    );
    TestValidator.equals(
      "session token matches request",
      guest.session_token,
      sessionToken,
    );

    // ip_address and user_agent should reflect the request values (either string or null)
    TestValidator.equals(
      "ip_address matches request",
      guest.ip_address,
      ip_address,
    );
    TestValidator.equals(
      "user_agent matches request",
      guest.user_agent,
      user_agent,
    );

    // Validate timestamps are ISO strings
    TestValidator.predicate(
      "created_at is a valid ISO date-time string",
      typeof guest.created_at === "string" &&
        !isNaN(Date.parse(guest.created_at)),
    );
    TestValidator.predicate(
      "updated_at is a valid ISO date-time string",
      typeof guest.updated_at === "string" &&
        !isNaN(Date.parse(guest.updated_at)),
    );

    // deleted_at can be either null or undefined or a valid ISO string
    if (guest.deleted_at !== null && guest.deleted_at !== undefined) {
      TestValidator.predicate(
        "deleted_at is ISO date string or null",
        typeof guest.deleted_at === "string" &&
          !isNaN(Date.parse(guest.deleted_at)),
      );
    }

    // Check for uniqueness of session tokens
    TestValidator.predicate(
      "session token uniqueness",
      !sessionTokens.has(guest.session_token),
    );
    sessionTokens.add(guest.session_token);
  }
}
