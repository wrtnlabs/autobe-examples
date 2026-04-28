import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller, Ip } from "@nestjs/common";
import typia from "typia";

import { IShoppingMallSeller } from "../../../../api/structures/IShoppingMallSeller";
import { postShoppingMallAuthSellerJoin } from "../../../../providers/postShoppingMallAuthSellerJoin";
import { postShoppingMallAuthSellerLogin } from "../../../../providers/postShoppingMallAuthSellerLogin";
import { postShoppingMallAuthSellerRefresh } from "../../../../providers/postShoppingMallAuthSellerRefresh";

@Controller("/shoppingMall/auth/seller")
export class ShoppingmallAuthSellerController {
  /**
   * This operation registers a new seller account for the marketplace by creating the canonical identity record in the shopping_mall_sellers table. That table is described as the registered seller account model with authentication credentials and account-level marketplace access controls, and it stores the unique login email in the email column together with the hashed credential in password_hash. The registration flow therefore establishes the seller's sign-in identity, not the seller's public storefront profile and not the approval decision itself.
   *
   * The operation must reflect the requirement that a seller may register and exist on the platform before being allowed to sell. The shopping_mall_sellers.approval_status field is explicitly documented as the current seller approval standing controlling whether the account is pending review, approved for selling, or rejected. For a newly joined seller, the implementation should initialize approval_status to pending and leave rejection_reason empty. This ensures the created account is consistent with the approval-gated selling authority requirement, where administrator approval is required before a seller can act as an active merchant.
   *
   * From a security perspective, this endpoint is an authorization operation for the seller actor even though it is used before a prior session exists. The handler must enforce uniqueness on shopping_mall_sellers.email, must hash the supplied password before persistence into password_hash, and must avoid exposing whether any existing deleted or historically retained seller record can be reactivated through this flow unless the underlying business policy explicitly supports it. Because the actor table includes banned and suspended flags, the creation flow should initialize both flags in a safe default state and should never trust client input for those governance-controlled attributes.
   *
   * This endpoint is related to the login and refresh operations that continue the authentication lifecycle after identity creation. A successful join may immediately return the same authorized token structure used by other authentication endpoints through IShoppingMallSeller.IAuthorized, allowing the new seller to enter seller-facing areas for identity and approval-status visibility. However, the returned authenticated state must not be interpreted as proof of approved selling authority, because the approval workflow is represented separately by shopping_mall_seller_approval_requests and the seller account's approval_status column.
   *
   * Expected errors include duplicate email conflicts, malformed registration data, or failures during session creation. If account creation succeeds but session persistence cannot be completed, the implementation should use a transaction or compensating rollback so the authentication result remains consistent and no orphaned sign-in state is returned.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Seller registration payload containing the credentials required to create a seller account.
     * @x-autobe-authorization-type join
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Create a new seller account using the submitted
     *   email and password payload defined by IShoppingMallSeller.IJoin.
     *   Validate that the email is syntactically valid and not already present
     *   in shopping_mall_sellers.email, hash the provided password, and insert
     *   a new shopping_mall_sellers row with a generated UUID, default
     *   approval_status set to pending, rejection_reason set to null, suspended
     *   set to false, banned set to false, and current timestamps for
     *   created_at and updated_at. After account creation, issue an
     *   authenticated seller session and JWT token set, persist the session in
     *   shopping_mall_seller_sessions with captured client metadata, and return
     *   IShoppingMallSeller.IAuthorized. The implementation must ensure that
     *   registration does not imply approved selling authority; it only
     *   establishes a registered seller identity that can later participate in
     *   the seller approval workflow. If the email already exists or the
     *   payload fails validation, reject the request with a business validation
     *   error and do not create session or actor records.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("join")
  public async join(
    @Ip()
    ip: string,
    @TypedBody()
    body: IShoppingMallSeller.IJoin,
  ): Promise<IShoppingMallSeller.IAuthorized> {
    try {
      return await postShoppingMallAuthSellerJoin({
        ip,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * This operation signs an existing seller into the platform using the canonical seller identity record in shopping_mall_sellers. The underlying actor table is documented as the record for sellers who sign in with email and password, with email as the unique account identifier for authentication and password_hash as the secure credential storage field. The login flow therefore authenticates against those exact columns and then creates a distinct session record in shopping_mall_seller_sessions.
   *
   * The seller account schema includes several marketplace control fields that affect how login is interpreted. The banned column states whether the seller is banned from logging in and using the platform, so this endpoint must block authentication when banned is true. The approval_status column describes whether the seller is pending review, approved, or rejected. The loaded requirements clarify that a seller with pending status may access seller identity and status information but may not exercise active selling authority, while a rejected seller must be informed that selling authority has not been granted and may submit a new approval request. For that reason, login should authenticate the seller identity while leaving downstream seller-only business operations to enforce approval-sensitive permissions.
   *
   * This endpoint also establishes the session lifecycle described by shopping_mall_seller_sessions. That model stores the belonged seller account, client IP address, originating client URL, referrer URL, the creation time, and the expiration time when the session is no longer valid for authentication. A successful login must therefore create a new session record and issue tokens whose validity aligns with the persisted session expiration. The response uses IShoppingMallSeller.IAuthorized so token issuance remains consistent across join, login, and refresh.
   *
   * This operation is commonly used after registration through POST /auth/seller/join, but it is also the main re-entry point for previously registered sellers. Sellers whose approval_status is rejected may log in to inspect the rejection-related context that is represented on shopping_mall_sellers.rejection_reason and then continue with the approval-request workflow. Sellers who are only suspended should be authenticated unless a separate service rule forbids login, because suspended is documented as restricting creation or editing of products while still allowing handling of existing orders rather than blocking platform sign-in itself.
   *
   * Expected errors include unknown email, wrong password, banned seller status, and non-active identity conditions such as operational deletion. Error messages should be phrased to protect credential confidentiality and should not reveal whether the email or password was specifically incorrect unless the security policy explicitly allows that distinction.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Seller sign-in payload containing the credentials required for authentication.
     * @x-autobe-authorization-type login
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Authenticate a seller using the credentials
     *   provided in IShoppingMallSeller.ILogin. Look up the seller by the
     *   unique shopping_mall_sellers.email value, verify the supplied password
     *   against password_hash, reject authentication when the account is
     *   banned, and handle deleted or otherwise unavailable identities
     *   according to active-account policy. When authentication succeeds,
     *   create a new shopping_mall_seller_sessions row containing the seller ID
     *   plus request metadata such as ip, href, referrer, created_at, and
     *   expired_at. Then issue JWT access and refresh tokens bound to the new
     *   session and return IShoppingMallSeller.IAuthorized. The implementation
     *   should not require approval_status to be approved for login itself
     *   unless broader policy says so, because loaded requirements only state
     *   that approval is required before selling activity, while identity and
     *   status visibility remain available prior to approval. Rejected sellers
     *   may still need authenticated access to view rejection_reason and submit
     *   a new approval request. Invalid credentials, banned state, or
     *   expired/deleted account status must produce safe authentication errors
     *   without leaking sensitive credential details.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("login")
  public async login(
    @Ip()
    ip: string,
    @TypedBody()
    body: IShoppingMallSeller.ILogin,
  ): Promise<IShoppingMallSeller.IAuthorized> {
    try {
      return await postShoppingMallAuthSellerLogin({
        ip,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * This operation refreshes an authenticated seller session by renewing tokens from an existing valid session context rather than re-verifying primary credentials. The loaded schema shows that seller sessions are persisted in shopping_mall_seller_sessions, where each row belongs to exactly one seller account and records created_at and expired_at values that define the session lifecycle. Refresh must therefore validate that the presented token still maps to a live session whose expiration boundary has not passed.
   *
   * The operation also remains anchored to the seller identity in shopping_mall_sellers. Even though refresh is session-based, the actor table still contains account-level access controls such as banned, suspended, approval_status, and deleted_at. In particular, the banned field is documented as whether the seller is banned from logging in and using the platform, so a refresh attempt should fail when the account has transitioned into a banned state since the original login. This prevents long-lived token reuse from bypassing later governance restrictions.
   *
   * From a workflow perspective, refresh complements POST /auth/seller/login and POST /auth/seller/join by providing token continuity after an authenticated session has already been created. The response type remains IShoppingMallSeller.IAuthorized so client applications can handle the same authorized token contract throughout the seller authentication lifecycle. The session metadata fields ip, href, and referrer were captured at login time and may be used for additional monitoring or anomaly detection during refresh if the implementation chooses to compare context.
   *
   * The refresh endpoint does not grant new business permissions. It merely renews authenticated access already associated with the seller identity and session. Any restrictions related to selling authority, such as pending or rejected approval_status, continue to be enforced by downstream seller business operations. This distinction is important because the schema separates authentication state in shopping_mall_seller_sessions from governance state in shopping_mall_sellers and approval workflow records.
   *
   * Expected errors include expired session timestamps, token-session mismatches, malformed refresh tokens, sessions that no longer exist, and seller accounts that have become banned or otherwise unavailable. These failures should return authentication errors without revealing internal token parsing details.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Seller refresh payload containing the token material required to renew authentication.
     * @x-autobe-authorization-type refresh
     * @x-autobe-authorization-actor seller
     * @x-autobe-specification Renew seller authentication using the refresh
     *   payload defined by IShoppingMallSeller.IRefresh. Validate the submitted
     *   refresh token, resolve the corresponding shopping_mall_seller_sessions
     *   record and seller identity, confirm that the session has not expired
     *   according to expired_at, and confirm that the seller remains allowed to
     *   hold authenticated platform access under current policy, especially not
     *   banned. Rotate or reissue tokens according to the platform JWT policy,
     *   optionally extending or replacing the session record, and return a
     *   fresh IShoppingMallSeller.IAuthorized response. Reject refresh attempts
     *   for missing, expired, revoked, malformed, or mismatched session tokens.
     *   The implementation must treat refresh as a continuation of an existing
     *   authenticated session rather than a credential login and should not
     *   require the seller to resubmit email and password.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("refresh")
  public async refresh(
    @TypedBody()
    body: IShoppingMallSeller.IRefresh,
  ): Promise<IShoppingMallSeller.IAuthorized> {
    try {
      return await postShoppingMallAuthSellerRefresh({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
