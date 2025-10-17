import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia from "typia";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";

import { IShoppingMallSeller } from "../../../../../structures/IShoppingMallSeller";

/**
 * Change seller password with current password verification.
 *
 * Enables authenticated sellers to change their password while logged in,
 * requiring current password verification for security. This endpoint serves
 * sellers who know their current password and want to update it for security
 * hygiene, suspected compromise, or personal preference, providing a secure
 * password rotation mechanism within an authenticated session.
 *
 * Authentication requirement enforces that the seller must have a valid JWT
 * access token and active session. The endpoint extracts the seller ID from the
 * authenticated token claims and validates the session exists in
 * shopping_mall_sessions table with is_revoked false and seller_id matching the
 * authenticated seller. This ensures only the legitimate account owner who can
 * authenticate with current credentials can change the password.
 *
 * Current password verification re-authenticates the seller by comparing the
 * provided current_password against the password_hash field in
 * shopping_mall_sellers table using bcrypt or Argon2 verification. This
 * critical security step prevents unauthorized password changes if someone
 * gains access to an unlocked device or stolen session token - the attacker
 * would need to know the current password to change it. If current password
 * verification fails, the endpoint returns error 'Current password is
 * incorrect' without incrementing failed_login_attempts (failed password change
 * is not the same as failed login).
 *
 * New password validation enforces identical complexity requirements as
 * registration and password reset: minimum 8 characters, maximum 128
 * characters, must contain at least one uppercase letter (A-Z), one lowercase
 * letter (a-z), one digit (0-9), and one special character (@, $, !, %, *, ?,
 * &, #). The system validates the new password does not match the seller's
 * email address (prevents easily guessable passwords based on account
 * identifier). If complexity validation fails, specific error messages indicate
 * which requirements are not satisfied.
 *
 * Password reuse prevention retrieves the password_history field (JSON array
 * storing up to 5 previous password hashes with format [{"hash": "bcrypt_hash",
 * "changed_at": "timestamp"}]) and compares the new password against all stored
 * historical hashes using bcrypt/Argon2 verification. If the new password
 * matches any of the last 5 passwords, the endpoint rejects the change with
 * error 'This password was recently used. Please choose a different password'
 * to enforce password rotation and prevent cycling between the same few
 * passwords.
 *
 * Password update process hashes the new password using bcrypt with cost factor
 * 12 or Argon2 and stores the hash in the password_hash field. The
 * password_changed_at timestamp is updated to the current time for security
 * audit tracking and password age policy enforcement. The current password_hash
 * value (before update) is appended to the password_history JSON array with the
 * current timestamp, maintaining chronological history of password changes. If
 * the password_history array contains more than 5 entries after appending, the
 * oldest entry is removed to maintain the 5-password limit.
 *
 * Selective session invalidation revokes all seller sessions EXCEPT the current
 * one to balance security and convenience. The system queries
 * shopping_mall_sessions table for all records where seller_id matches the
 * seller, is_revoked is false, and refresh_token is NOT equal to the current
 * session's refresh token (identified from the request's refresh token or
 * session cookie). For all matching sessions, is_revoked is set to true and
 * revoked_at is set to the current timestamp. This forces the seller to
 * re-login on all other devices and browsers (mobile apps, other computers,
 * tablets) while allowing them to continue working in the current session
 * without interruption.
 *
 * Security notification email is sent to the seller's registered email address
 * confirming the password change, including the change timestamp, approximate
 * location (from approximate_location field of current session), device
 * information (from device_name field), and advisory to contact support
 * immediately if the change was not authorized. This alert enables the seller
 * to detect unauthorized password changes quickly and take protective action.
 *
 * The endpoint returns a simple success confirmation message without issuing
 * new JWT tokens, as the seller's current session remains valid and
 * authenticated. The seller can continue using their existing access token and
 * refresh token for the current session. All other sessions are invalidated and
 * will receive authentication errors on next API request, prompting re-login
 * with the new password.
 *
 * @param props.connection
 * @param props.body Current password for verification and new password
 *   credentials
 * @path /auth/seller/password/change
 * @accessor api.functional.auth.seller.password.change.changePassword
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function changePassword(
  connection: IConnection,
  props: changePassword.Props,
): Promise<changePassword.Response> {
  return true === connection.simulate
    ? changePassword.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...changePassword.METADATA,
          path: changePassword.path(),
          status: null,
        },
        props.body,
      );
}
export namespace changePassword {
  export type Props = {
    /** Current password for verification and new password credentials */
    body: IShoppingMallSeller.IPasswordChange;
  };
  export type Body = IShoppingMallSeller.IPasswordChange;
  export type Response = IShoppingMallSeller.IPasswordChangeResponse;

  export const METADATA = {
    method: "POST",
    path: "/auth/seller/password/change",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/auth/seller/password/change";
  export const random = (): IShoppingMallSeller.IPasswordChangeResponse =>
    typia.random<IShoppingMallSeller.IPasswordChangeResponse>();
  export const simulate = (
    connection: IConnection,
    props: changePassword.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: changePassword.path(),
      contentType: "application/json",
    });
    try {
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
