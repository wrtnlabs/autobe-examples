import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller, Ip } from "@nestjs/common";
import typia from "typia";

import { IShoppingMallSuperAdministrator } from "../../../../api/structures/IShoppingMallSuperAdministrator";
import { postShoppingMallAuthSuperAdministratorJoin } from "../../../../providers/postShoppingMallAuthSuperAdministratorJoin";
import { postShoppingMallAuthSuperAdministratorLogin } from "../../../../providers/postShoppingMallAuthSuperAdministratorLogin";
import { postShoppingMallAuthSuperAdministratorRefresh } from "../../../../providers/postShoppingMallAuthSuperAdministratorRefresh";

@Controller("/shoppingMall/auth/superAdministrator")
export class ShoppingmallAuthSuperadministratorController {
  /**
   * This operation registers a new super administrator identity and immediately authorizes that identity for platform governance access. It is built on the canonical actor table shopping_mall_super_administrators, which the schema describes as the root identity record for the highest level of platform governance. The table stores the unique email address used as the super administrator login identifier, the hashed password used to authenticate the account, and the active lifecycle flag that controls whether the account is currently allowed to access the platform. Because this endpoint creates that root identity, it is the formal entry point for super administrator credential enrollment.
   *
   * The operation must validate the uniqueness of the email field exactly as required by the actor table's unique constraint. It must also transform the submitted secret into the password_hash field rather than storing any raw credential data. The resulting record should be created as an active account unless a stricter provisioning rule is imposed elsewhere by the application. The deleted_at lifecycle field must be respected during conflict handling so the service does not silently create ambiguous privileged identities against a retained email address.
   *
   * After successful actor creation, the operation should create a corresponding row in shopping_mall_super_administrator_sessions. That session table is documented as recording each authenticated super administrator session with client connection context and expiration time for security auditing and privileged access lifecycle management. Accordingly, the join endpoint is not just account creation; it is also the first privileged session issuance step, capturing IP address, originating href, referrer, issuance time, and expiration boundary in a durable session record.
   *
   * This endpoint creates access for the highest-privilege governance actor, so the authorizationActor is explicitly aligned to superAdministrator for consistent downstream authorization metadata. Validation failures, duplicate email conflicts, malformed credentials, or database constraint violations must be surfaced clearly as registration failure conditions. Related workflow integration is straightforward: after this operation succeeds, the client receives the same authorized payload shape used by the login and refresh operations, enabling immediate transition into authenticated super administrator activity.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Super administrator registration credentials and initial authorization request data.
   * @x-autobe-authorization-type join
   * @x-autobe-authorization-actor superAdministrator
   * @x-autobe-specification Implement super administrator registration by validating the incoming join payload against the unique email requirement of shopping_mall_super_administrators and the credential creation policy expected for password_hash generation. Before insertion, query the super administrator actor table by email to ensure no active or retained conflicting account already exists under the unique constraint. Hash the submitted password using the platform's secure password hasher and create a new shopping_mall_super_administrators row with a new UUID, normalized email, hashed password, active=true, current timestamps, and deleted_at=null.
   *
   * Within the same transaction, create an initial shopping_mall_super_administrator_sessions row for the newly created actor. Persist the super administrator ID together with client context values such as ip, href, referrer, created_at, and expired_at so the first authorization result corresponds to a durable privileged session lifecycle. Generate JWT access and refresh tokens whose subject references the new super administrator identity and whose refresh claims are compatible with later lookup of the persisted session.
   *
   * Reject registration when the email is already in use, when the account has been retained but should not be recreated under the same unique email, or when the payload fails password policy validation. Return the exact authorized response DTO after successful transaction completion. No prerequisite APIs are required because registration is the root entry point for a new privileged identity.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("join")
  public async join(
    @Ip()
    ip: string,
    @TypedBody()
    body: IShoppingMallSuperAdministrator.IJoin,
  ): Promise<IShoppingMallSuperAdministrator.IAuthorized> {
    try {
      return await postShoppingMallAuthSuperAdministratorJoin({
        ip,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * This operation authenticates an existing super administrator using the credentials stored in shopping_mall_super_administrators. The schema explicitly defines email as the unique login identifier and password_hash as the hashed password used to authenticate the super administrator account. That makes this endpoint the credential-validation counterpart to registration, intended for established privileged identities that need to begin a new authenticated governance session.
   *
   * The login flow must enforce the lifecycle controls embedded in the actor schema. The active column is described as indicating whether the super administrator account is currently allowed to access the platform, so an inactive account must be denied even when the supplied password is correct. The deleted_at field marks when the account was removed from active use and must likewise prevent fresh sign-in because the actor table is meant to remain the canonical active identity record for privileged access. These checks are essential for the highest-level administrative actor.
   *
   * On successful authentication, the service must create a row in shopping_mall_super_administrator_sessions. That table exists specifically to record each authenticated super administrator session with client connection context and expiration time for security auditing, logout handling, and privileged access lifecycle management. Therefore the login operation should persist the session boundary, client IP address, originating href, and referrer before returning the authorization payload. This ensures that privileged sign-in is observable and that downstream refresh logic has a stable session anchor.
   *
   * This endpoint is the privileged sign-in surface for the superAdministrator actor and is explicitly tagged with authorizationActor equal to superAdministrator to satisfy downstream authorization mapping requirements. Error handling should avoid revealing whether the email was unknown or the password was incorrect. The endpoint works closely with refresh: login establishes the persisted privileged session and authorized token set, while refresh later renews access for a still-valid session. If a client needs first-time privileged enrollment instead of sign-in, it should use POST /auth/superAdministrator/join before using this endpoint.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Super administrator login credentials.
   * @x-autobe-authorization-type login
   * @x-autobe-authorization-actor superAdministrator
   * @x-autobe-specification Implement super administrator login by locating the actor row in shopping_mall_super_administrators using the submitted email, then verifying the submitted password against password_hash with the platform password hasher. Deny authentication if no matching identity exists, if deleted_at is set, or if active is false. On success, create a new shopping_mall_super_administrator_sessions row capturing the authenticated actor ID and client context such as ip, href, referrer, created_at, and expired_at.
   *
   * Issue JWT access and refresh tokens bound to the authenticated super administrator and the newly created persisted session. The refresh token or its claims should allow later correlation to the server-side session row so refresh logic can enforce expiration and actor availability checks. The service should avoid leaking whether the email or password was incorrect beyond an authentication failure outcome suitable for a privileged login surface.
   *
   * Handle edge cases for duplicate abnormal states defensively, including impossible multiple-row lookup failures, inactive privileged accounts, and deleted identities retained for lifecycle control. Return the exact authorized response DTO only after the session row has been created successfully, ensuring token issuance and persisted session state remain consistent.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("login")
  public async login(
    @Ip()
    ip: string,
    @TypedBody()
    body: IShoppingMallSuperAdministrator.ILogin,
  ): Promise<IShoppingMallSuperAdministrator.IAuthorized> {
    try {
      return await postShoppingMallAuthSuperAdministratorLogin({
        ip,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * This operation renews authorization for an already established super administrator session. Its purpose is grounded in the dedicated session table shopping_mall_super_administrator_sessions, which the schema describes as recording each authenticated super administrator session with client connection context and expiration time for privileged access lifecycle management. Because the table includes created_at and expired_at for every session, refresh must respect that persisted session lifetime instead of treating privileged renewal as an unconstrained token minting action.
   *
   * The refresh workflow must also re-check the current state of the parent actor in shopping_mall_super_administrators. The super administrator actor table contains the active flag controlling whether the account is currently allowed to access the platform, and it includes deleted_at to mark removal from active use. A refresh request therefore remains valid only while both the session and the parent privileged identity remain valid. This prevents previously issued credentials from extending access after governance privileges have been disabled or the identity has been removed.
   *
   * In implementation terms, the request payload should provide the material necessary to validate and correlate the refresh attempt to an existing privileged session. After successful validation, the service returns the same IShoppingMallSuperAdministrator.IAuthorized response shape used by join and login so the client can continue authenticated platform governance without re-entering credentials. If session rotation or expiry extension is part of the security policy, those updates should be reflected in the persisted session lifecycle represented by the session table.
   *
   * This endpoint renews authorization specifically for the superAdministrator actor and is explicitly tagged with authorizationActor equal to superAdministrator for consistent downstream authorization handling. Join creates a new privileged identity and first session, login validates credentials and issues a new session, and refresh renews access for a session that is already known to the system. If the persisted session has expired or the actor is no longer active, refresh must fail and the client must return to the login flow rather than receiving continued privileged tokens.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Super administrator refresh token payload.
   * @x-autobe-authorization-type refresh
   * @x-autobe-authorization-actor superAdministrator
   * @x-autobe-specification Implement token refresh by validating the submitted refresh payload, decoding or verifying the refresh credential, and resolving the associated persisted session in shopping_mall_super_administrator_sessions. Confirm that the session exists, is not expired according to expired_at, and belongs to a currently valid shopping_mall_super_administrators actor row. Also verify that the actor remains active and not deleted before issuing renewed tokens.
   *
   * If the refresh model uses rotation, generate a replacement access token and replacement refresh token while extending or renewing the relevant session expiry according to platform policy. If rotation is not used, still persist any session lifecycle updates needed to keep expired_at accurate. The service should return the exact authorized response DTO and ensure refresh cannot revive a removed, inactive, or expired privileged session.
   *
   * Reject refresh when the token payload is invalid, the referenced session cannot be found, the session has expired, the super administrator row is inactive, or deleted_at is set. Keep the refresh process free of separate authentication prerequisites because the refresh credential itself is the authorization artifact being validated.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("refresh")
  public async refresh(
    @TypedBody()
    body: IShoppingMallSuperAdministrator.IRefresh,
  ): Promise<IShoppingMallSuperAdministrator.IAuthorized> {
    try {
      return await postShoppingMallAuthSuperAdministratorRefresh({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
