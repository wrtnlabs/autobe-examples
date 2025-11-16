export namespace IShoppingMallSellerEmailVerificationComplete {
  /**
   * Request DTO used to complete seller email verification by consuming a
   * previously issued verification token.
   *
   * The client submits the opaque verification token string that was
   * delivered to the seller via email. The backend validates that the token
   * exists, has not expired, and has not already been consumed, then marks it
   * as consumed and applies any credential status changes defined by platform
   * policy.
   */
  export type IRequest = {
    /**
     * Opaque email verification token string that uniquely identifies a row
     * in shopping_mall_email_verification_tokens. Typically carried in a
     * verification link sent to the seller's email address and treated as
     * an unguessable secret value.
     */
    token: string;
  };

  /**
   * Response payload returned after attempting to complete a seller email
   * verification flow.
   *
   * When `success` is true, the supplied verification token has been
   * validated and consumed, and the seller's email address is now treated as
   * verified in the authentication system. Internal token and credential
   * state changes remain hidden from the client and are reflected only in
   * server-side entities such as shopping_mall_email_verification_tokens,
   * shopping_mall_auth_credentials, shopping_mall_auth_logs, and
   * shopping_mall_security_events.
   *
   * When `success` is false, the verification flow has not been completed,
   * typically because the token was invalid, expired, or already consumed.
   * The response still avoids exposing sensitive internal details and instead
   * provides a safe, human-readable `message` that the client can surface to
   * the seller. Clients use `requiresAdditionalAction` together with
   * `success` to determine whether the seller can proceed into the
   * application or must complete further steps or re-trigger the verification
   * process.
   */
  export type IResponse = {
    /**
     * Indicates whether the seller email verification token was
     * successfully processed and the seller's email address is now
     * considered verified.
     *
     * A value of `true` means the token was valid, unexpired, unused, and
     * has been consumed, and any associated credential state (for example,
     * status fields on shopping_mall_auth_credentials) has been updated
     * according to platform policy. A value of `false` means the
     * verification could not be completed (for example, due to an invalid,
     * expired, or replayed token), and the seller remains in a non-verified
     * state from the platform's perspective.
     */
    success: boolean;

    /**
     * Human-readable message summarizing the result of the verification
     * flow, suitable for display in UI confirmation or error screens.
     *
     * On success, this typically conveys that the email has been verified
     * and may optionally hint at the next step (for example, returning to
     * login or dashboard). On failure, it describes the high-level reason
     * the verification did not complete (such as an invalid or expired
     * link) without exposing sensitive implementation details. The message
     * text may be localized at the presentation layer using this value as a
     * key or template hint depending on client design.
     */
    message: string;

    /**
     * Flag indicating whether the seller must perform additional actions
     * after this verification attempt before gaining full access to the
     * platform.
     *
     * When `requiresAdditionalAction` is `false` and `success` is `true`,
     * the seller can typically proceed directly to using the application
     * with a fully verified email. When `requiresAdditionalAction` is
     * `true`, the seller may need to complete follow-up steps such as
     * providing additional profile information, awaiting manual review, or
     * re-initiating the verification flow if the token was invalid or
     * expired. Client applications should use this flag, together with
     * `success`, to decide whether to route the seller to a simple
     * confirmation screen, a more detailed onboarding or support flow, or
     * back to the area where a fresh verification can be requested.
     */
    requiresAdditionalAction: boolean;
  };
}
