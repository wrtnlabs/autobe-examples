import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller, Ip } from "@nestjs/common";
import typia from "typia";

import { IShoppingMallAdministrator } from "../../../../api/structures/IShoppingMallAdministrator";
import { postShoppingMallAuthAdministratorJoin } from "../../../../providers/postShoppingMallAuthAdministratorJoin";
import { postShoppingMallAuthAdministratorLogin } from "../../../../providers/postShoppingMallAuthAdministratorLogin";
import { postShoppingMallAuthAdministratorRefresh } from "../../../../providers/postShoppingMallAuthAdministratorRefresh";

@Controller("/shoppingMall/auth/administrator")
export class ShoppingmallAuthAdministratorController {
  /**
   * This endpoint registers a new administrator identity for elevated marketplace governance access. The underlying actor table, shopping_mall_administrators, is described as the canonical administrator identity used for authentication, moderation eligibility, and audit-linked governance actions across the marketplace. Its schema confirms that the administrator identity is credential-based, with a unique email field used as the login identifier and a password_hash field used to store the secret in protected form rather than plaintext. The operation therefore exists to create that canonical identity in a way that is consistent with the platform's authentication model.
   *
   * From a security perspective, the endpoint must treat the administrator role as distinct from customer, seller, and super administrator identities. The schema description explicitly says administrator authority is a distinct authenticated role, so this registration flow must create an administrator-only account rather than attaching administrative capability onto another actor type. The operation should enforce uniqueness of the email value, hash the submitted password before persistence, and initialize lifecycle fields that later control governance access, including active, banned, created_at, updated_at, and deleted_at behavior.
   *
   * This operation is closely related to the administrator session model. The shopping_mall_administrator_sessions table is described as recording authenticated session instances for secure elevated platform access, storing connection context and expiration timing for login and session validation flows. For that reason, once registration succeeds, the implementation should immediately issue authorization material and persist a first session record so the response can return IShoppingMallAdministrator.IAuthorized consistently with the required authorization table.
   *
   * The endpoint also sits at the start of the broader authentication workflow. After a successful join, subsequent credential-based access can be performed through POST /auth/administrator/login, while token renewal should be performed through POST /auth/administrator/refresh. If a later credential recovery scenario occurs, the password recovery process should begin with POST /auth/administrator/password/reset because the dedicated password reset table exists specifically to support secure administrator credential recovery.
   *
   * Error handling must cover duplicate email conflicts, invalid input, hashing failures, and any inability to create the related session record. Because administrator accounts are governance identities, the service should fail safely and avoid leaving a partially created account or session when downstream token issuance does not complete successfully.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Administrator registration information.
     * @x-autobe-authorization-type join
     * @x-autobe-authorization-actor administrator
     * @x-autobe-specification Create a new administrator account by validating
     *   the join payload, normalizing the submitted email, checking that no
     *   non-deleted administrator already owns the same unique email address,
     *   hashing the provided password, and inserting a row into
     *   shopping_mall_administrators with a new UUID, active set according to
     *   governance bootstrap policy, banned set to false, and created_at and
     *   updated_at timestamps initialized to the current time. After successful
     *   creation, issue access and refresh tokens for the new administrator,
     *   create a corresponding shopping_mall_administrator_sessions record
     *   capturing client context such as IP address, href, referrer,
     *   created_at, and expired_at, and return the authorized payload defined
     *   by IShoppingMallAdministrator.IAuthorized.
   *
   * The service must reject duplicate email addresses, malformed credentials, and any attempt to join with data that violates the table's unique email constraint. If bootstrap policy requires administrators to be immediately usable, set active to true; otherwise, set the initial active state according to platform bootstrap configuration while still keeping banned false unless an explicit governance rule says otherwise. The implementation must use a transaction so the account row and session record are either both committed or both rolled back.
   *
   * Edge cases include attempts to reuse an email belonging to a deleted administrator account if the product policy disallows reuse, concurrent join attempts racing on the unique email index, and token issuance failure after account creation. In the latter case, rollback the account creation or perform compensating cleanup so no orphaned partially onboarded administrator identity remains without an intentional governance decision.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("join")
  public async join(
    @Ip()
    ip: string,
    @TypedBody()
    body: IShoppingMallAdministrator.IJoin,
  ): Promise<IShoppingMallAdministrator.IAuthorized> {
    try {
      return await postShoppingMallAuthAdministratorJoin({
        ip,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * This endpoint signs an administrator into the platform using the credential fields confirmed by the shopping_mall_administrators schema. That table is documented as storing administrator accounts with email and password credentials for elevated platform governance access, and it explicitly marks email as the unique login identifier and password_hash as the stored authentication secret. Accordingly, this operation authenticates the administrator by email and password and returns authorization material in the required IShoppingMallAdministrator.IAuthorized response shape.
   *
   * The account lifecycle controls in the administrator schema are central to this endpoint. The same table includes active and banned boolean fields, described respectively as whether the administrator account is currently active and whether it is banned and therefore blocked from authenticated platform access. The login implementation must therefore deny authentication not only for wrong credentials, but also when the governance identity is inactive, banned, or removed from active use through deleted_at. This mirrors the broader requirements pattern that banned platform actors cannot use normal sign-in while the ban remains in effect.
   *
   * The session layer is represented by shopping_mall_administrator_sessions, which is described as recording authenticated session instances for secure elevated platform access and storing expiration timing for login and session validation flows. For that reason, successful login should create a concrete session record with client context such as ip, href, and referrer before the tokens are returned. This gives the refresh flow a durable server-side session boundary even though the main authorization mechanism is JWT-based.
   *
   * This login endpoint is part of a coordinated authorization sequence. New governance identities may first be created through POST /auth/administrator/join. Once authenticated, future token renewal should occur through POST /auth/administrator/refresh rather than re-submitting credentials on every access token expiration. If the administrator no longer remembers the password, the recovery journey should begin through POST /auth/administrator/password/reset rather than using repeated failing login attempts.
   *
   * Expected failures include unknown email addresses, password mismatch, banned status, inactive status, deleted accounts, and infrastructure failures when creating the related session record. The service should avoid leaking sensitive authentication details in error responses and should preserve the integrity of governance access boundaries at all times.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Administrator login credentials.
     * @x-autobe-authorization-type login
     * @x-autobe-authorization-actor administrator
     * @x-autobe-specification Authenticate an administrator by validating the
     *   login payload against shopping_mall_administrators. Normalize the
     *   submitted email, load the matching administrator row by unique email,
     *   verify that deleted_at is null, active is true, and banned is false,
     *   then compare the submitted password with password_hash using the
     *   platform password hasher. If validation succeeds, create a new
     *   shopping_mall_administrator_sessions record capturing the authenticated
     *   administrator ID, client IP address, href, referrer, created_at, and
     *   expired_at, then mint access and refresh tokens bound to the session
     *   and return IShoppingMallAdministrator.IAuthorized.
   *
   * The service must reject nonexistent email addresses, incorrect passwords, deleted accounts, inactive accounts, and banned accounts with safe authentication errors that do not disclose which part of the credential check failed unless governance policy intentionally distinguishes account-state failures. The implementation should update no credential state on failed login other than optional audit logging handled outside this interface.
   *
   * Edge cases include concurrent repeated logins, expired client metadata, and attempts by banned or inactive administrators to regain access. Session creation and token issuance should be atomic enough that a token is never returned without a durable session row when the architecture expects refresh validation against shopping_mall_administrator_sessions.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("login")
  public async login(
    @Ip()
    ip: string,
    @TypedBody()
    body: IShoppingMallAdministrator.ILogin,
  ): Promise<IShoppingMallAdministrator.IAuthorized> {
    try {
      return await postShoppingMallAuthAdministratorLogin({
        ip,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * This endpoint renews authorization for an already authenticated administrator without requiring the administrator to submit email and password again. The existence of shopping_mall_administrator_sessions is decisive here: the table is documented as storing authenticated session instances for administrators, including creation context and the expired_at timestamp needed for login, logout, and session validation flows. That schema evidence supports a refresh design in which the platform validates both a JWT refresh credential and the backing session record before issuing a new authorized response.
   *
   * The administrator identity must still be valid at refresh time. The shopping_mall_administrators table describes active and banned state as access-control lifecycle fields used to allow or deny administrative login according to governance policy. Refresh must honor those same fields, because a token renewal endpoint must not bypass governance status changes that occurred after the original login. If an administrator becomes banned, inactive, or deleted, the refresh flow must stop issuing fresh tokens immediately.
   *
   * This endpoint is designed to work after either the join or login flow has created an authenticated session context. A newly registered administrator may receive initial authorization material from POST /auth/administrator/join, and a returning administrator receives it from POST /auth/administrator/login. After either of those operations, POST /auth/administrator/refresh becomes the correct way to continue an authenticated session as access tokens expire. It should not require any separate authentication prerequisite declaration because authorization state is expressed by the endpoint design itself.
   *
   * The security behavior of this endpoint should be conservative. It must reject expired or unrecognized refresh submissions, refuse to refresh sessions whose expired_at boundary has passed, and fail when the owning administrator no longer satisfies governance access requirements. Because administrator access represents elevated platform authority, refresh validation must be strict and must not privilege convenience over correctness.
   *
   * Error handling should clearly separate invalid authorization state from general server errors while still avoiding disclosure of token internals. The end result is a controlled continuation of a legitimate session rather than creation of a new identity.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Administrator token refresh payload.
     * @x-autobe-authorization-type refresh
     * @x-autobe-authorization-actor administrator
     * @x-autobe-specification Refresh administrator authorization by validating
     *   the submitted refresh payload, resolving the associated
     *   shopping_mall_administrator_sessions record, checking that the session
     *   exists and has not passed expired_at, loading the owning
     *   shopping_mall_administrators row, and verifying that the administrator
     *   remains active, not banned, and not deleted. If valid, rotate or renew
     *   authorization material according to platform JWT policy and return a
     *   fresh IShoppingMallAdministrator.IAuthorized payload. When rotation is
     *   enabled, persist the new session expiration or replacement session
     *   metadata in the database as needed.
   *
   * The service must reject expired refresh credentials, missing sessions, deleted sessions, administrators that were later banned, administrators that became inactive after the original login, and deleted administrator accounts. It should also ensure that refresh cannot resurrect access for an administrator whose governance status changed after token issuance.
   *
   * Edge cases include session expiry races, repeated refresh submissions, and clock-skew handling near expired_at boundaries. Implementation should be careful to check both token validity and database-backed session validity so stale or replayed refresh attempts cannot produce fresh access tokens after session revocation or expiry.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("refresh")
  public async refresh(
    @TypedBody()
    body: IShoppingMallAdministrator.IRefresh,
  ): Promise<IShoppingMallAdministrator.IAuthorized> {
    try {
      return await postShoppingMallAuthAdministratorRefresh({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
