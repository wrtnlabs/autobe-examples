import { TypedBody, TypedRoute } from "@nestia/core";
import { Controller, Ip } from "@nestjs/common";
import typia from "typia";

import { IHrmTimeTrackingManager } from "../../../../api/structures/IHrmTimeTrackingManager";
import { postHrmTimeTrackingAuthManagerJoin } from "../../../../providers/postHrmTimeTrackingAuthManagerJoin";
import { postHrmTimeTrackingAuthManagerLogin } from "../../../../providers/postHrmTimeTrackingAuthManagerLogin";
import { postHrmTimeTrackingAuthManagerRefresh } from "../../../../providers/postHrmTimeTrackingAuthManagerRefresh";

@Controller("/hrmTimeTracking/auth/manager")
export class HrmtimetrackingAuthManagerController {
  /**
   * This endpoint registers a new manager authentication account for the HRM time tracking platform. The underlying actor table, hrm_time_tracking_managers, is described as storing the login identity and credential state for manager users, and it intentionally contains only the core authentication and lifecycle fields required for access control. In concrete schema terms, that means the registration flow is centered on the manager account email, which is the unique sign-in identifier, and password_hash, which stores the protected credential after secure hashing. The endpoint exists to establish that manager identity before the user can access organization-scoped supervisory capabilities such as employee management, project management, timesheet approval, and report viewing.
   *
   * From a data perspective, a successful registration creates a new row in hrm_time_tracking_managers with a generated primary key id and lifecycle timestamps created_at and updated_at. The operation must also respect the deleted_at column, which represents deletion or deactivation from authentication use, when determining whether a submitted email can be accepted under the platform’s account lifecycle policy. Because the schema places sessions in the separate hrm_time_tracking_manager_sessions table, registration should immediately continue into session establishment so the client receives an authorized result rather than only a bare account record.
   *
   * The related session table is described as storing connection context and session lifetime information for authenticated manager accounts. Accordingly, after the manager account is created, the endpoint should create a session row containing the authenticated manager account reference hrm_time_tracking_manager_id along with the request context fields ip, href, and referrer, plus created_at and expired_at to define the session lifetime. This coupling between account creation and initial session issuance aligns with the platform’s registration and login flow requirements and gives the client the same authorized response structure used by other authentication entry points.
   *
   * Security behavior for this endpoint is intentionally limited to fields confirmed in the loaded schema. The system must validate email uniqueness because hrm_time_tracking_managers enforces a unique constraint on email, and it must never store raw passwords because the actor table is designed around password_hash rather than plaintext credentials. No assumptions are made about email verification, multifactor enrollment, or profile initialization because those fields are not present in the loaded manager authentication schema. Error handling should clearly distinguish duplicate email conflicts, invalid registration payloads, and failures during session issuance.
   *
   * This operation is typically the first step for a new manager identity. After it returns an IHrmTimeTrackingManager.IAuthorized payload, the client can proceed directly to authorized manager workflows without first calling the login endpoint. If the account already exists, the client should instead use POST /auth/manager/login to authenticate with existing credentials. Token renewal after the initial session has aged is handled by POST /auth/manager/refresh.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Registration information for creating a new manager account.
   * @x-autobe-authorization-type join
   * @x-autobe-authorization-actor manager
   * @x-autobe-specification Create a new manager authentication identity in the hrm_time_tracking_managers table using the email and password material provided in IHrmTimeTrackingManager.IJoin. The service must normalize and validate the email, verify that no non-deleted manager account already exists with the same unique email value, hash the submitted password into password_hash using the platform password hashing policy, and insert a new manager row with a generated UUID id plus created_at and updated_at timestamps. After successful account creation, the service must create a corresponding hrm_time_tracking_manager_sessions record linked by hrm_time_tracking_manager_id. The session creation logic must capture request context such as ip, href, and referrer when available, generate session lifetime values through created_at and expired_at, and mint JWT access and refresh tokens that encode the newly created manager identity and session linkage.
   *
   * The operation must reject duplicate email attempts, malformed or missing credential fields, and attempts to register against an already deactivated-but-conflicting account according to platform policy. It must also ensure transactional consistency so that account creation and session creation either both succeed or both fail. If account insertion succeeds but session persistence fails, the transaction must roll back. The returned IHrmTimeTrackingManager.IAuthorized payload must represent a fully authorized state immediately after join, allowing the client to continue into manager-facing flows without a separate login call.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("join")
  public async join(
    @Ip()
    ip: string,
    @TypedBody()
    body: IHrmTimeTrackingManager.IJoin,
  ): Promise<IHrmTimeTrackingManager.IAuthorized> {
    try {
      return await postHrmTimeTrackingAuthManagerJoin({
        ip,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * This endpoint authenticates an existing manager account and starts a new authorization session for the HRM time tracking platform. The manager actor schema explicitly defines email as the unique sign-in identifier and password_hash as the stored hashed password, so the login flow is a direct credential verification process against those fields. The endpoint is intended for manager users who already possess a platform account and need to enter the system in order to access organization-scoped supervisory functions allowed by their assigned permissions.
   *
   * The account table for this actor, hrm_time_tracking_managers, is described as containing only core authentication and lifecycle fields. That design means the login endpoint should limit itself to identity lookup, credential verification, and lifecycle checks rather than trying to manage profile data, role configuration, or business membership structures that belong to other dedicated tables. In particular, deleted_at must be considered during authentication because the schema describes it as the timestamp set when the manager account is deleted or deactivated from authentication use. An account in that state must not be treated as a normal active login target.
   *
   * Upon successful verification, the endpoint must persist a new record in hrm_time_tracking_manager_sessions. That table is described as storing connection context and session lifetime information for authenticated manager accounts, and its columns make the expected behavior concrete: the session records the authenticated manager reference through hrm_time_tracking_manager_id, captures request origin context via ip, href, and referrer, and defines validity using created_at and expired_at. This session creation step is important not only for auditing login events but also for supporting refresh-token semantics in the separate refresh endpoint.
   *
   * Security and validation rules for this operation are grounded in confirmed schema details. Because email is uniquely indexed, lookup is deterministic for a valid manager account. Because password_hash is the stored credential field, the endpoint must compare the submitted password through a secure password verification routine and must never expose the raw hash in any response. The API documentation intentionally avoids claiming support for additional mechanisms such as one-time passcodes, email verification gates, or organization context switching because those capabilities are not represented in the loaded manager authentication schema.
   *
   * This operation should be used when a manager account already exists and the client needs a new authorized session. Clients that are creating a brand-new manager account should use POST /auth/manager/join instead. Clients holding a valid refresh token from an existing session should use POST /auth/manager/refresh to renew authorization without re-submitting primary credentials.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Credential payload for authenticating an existing manager account.
   * @x-autobe-authorization-type login
   * @x-autobe-authorization-actor manager
   * @x-autobe-specification Authenticate an existing manager account using the credentials provided in IHrmTimeTrackingManager.ILogin. The service must locate the hrm_time_tracking_managers row by the unique email identifier, ensure the account exists and is not blocked from authentication use through deleted_at, and verify the submitted password against password_hash using the platform hash comparison routine. On success, it must create a new hrm_time_tracking_manager_sessions record for the authentication event, storing hrm_time_tracking_manager_id, ip, href, referrer, created_at, and expired_at, then issue JWT access and refresh tokens bound to the manager identity and session.
   *
   * The implementation must reject nonexistent accounts, invalid passwords, expired or disallowed authentication states, and malformed credential payloads without leaking unnecessary account existence details beyond platform policy. It must also preserve auditability by always recording successful logins in the session table and by ensuring the new session expiration is calculated consistently. The response must be returned as IHrmTimeTrackingManager.IAuthorized and should include the token set and any session-bound authorization information expected by downstream protected manager APIs.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("login")
  public async login(
    @Ip()
    ip: string,
    @TypedBody()
    body: IHrmTimeTrackingManager.ILogin,
  ): Promise<IHrmTimeTrackingManager.IAuthorized> {
    try {
      return await postHrmTimeTrackingAuthManagerLogin({
        ip,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * This endpoint renews authorization for a manager who already has an authenticated session but needs fresh tokens to continue using the HRM time tracking platform. The requirement to generate a refresh operation is explicit for member actors, and the loaded session schema provides the concrete persistence model that makes token renewal meaningful. The hrm_time_tracking_manager_sessions table is described as storing session lifetime information for authenticated manager accounts, and its created_at and expired_at columns define whether a session remains eligible to support ongoing authorization.
   *
   * The refresh flow is tied to both the session table and the manager actor table. The session must resolve back to a specific manager through hrm_time_tracking_manager_id, and the related hrm_time_tracking_managers record must still represent a valid authentication identity. That actor table stores the manager login identity and credential lifecycle information, including deleted_at as the marker that an account has been deleted or deactivated from authentication use. Even if a refresh token is structurally valid, the endpoint must refuse renewal when the underlying manager account is no longer eligible for authentication.
   *
   * Compared with the login endpoint, this operation does not re-verify primary credentials through email and password_hash. Instead, it extends an already established authenticated relationship by validating the refresh request against the persisted session lifetime and returning a new IHrmTimeTrackingManager.IAuthorized payload. This separation is important for user experience and security because it allows continuous authorized access without requiring the manager to repeatedly submit email and password while still enforcing expiration boundaries from the session data model.
   *
   * The design of this endpoint intentionally remains within confirmed schema scope. It references only the loaded session fields hrm_time_tracking_manager_id, ip, href, referrer, created_at, and expired_at, plus the manager lifecycle fields id, email, password_hash, created_at, updated_at, and deleted_at where relevant to continued authentication eligibility. It does not claim support for server-side logout, token revocation lists, or multifactor refresh challenges because those mechanisms were not established in the loaded materials for this task.
   *
   * This operation is used after either POST /auth/manager/join or POST /auth/manager/login has already returned an authorized token set and the client later needs renewal. If the presented refresh credential is invalid or the session has passed expired_at, the client should authenticate again through POST /auth/manager/login. No prerequisite business APIs are required before calling refresh.
   *
   * @setHeader token.access Authorization
   *
   * @param connection
   * @param body Refresh token payload for renewing manager authorization.
   * @x-autobe-authorization-type refresh
   * @x-autobe-authorization-actor manager
   * @x-autobe-specification Renew manager authorization tokens using the refresh material supplied in IHrmTimeTrackingManager.IRefresh. The service must validate the presented refresh token, resolve its associated manager identity and session context, confirm that the referenced hrm_time_tracking_manager_sessions record exists and remains within its expired_at lifetime, and verify that the related hrm_time_tracking_managers account remains eligible for authentication use, including deleted_at checks. When refresh validation succeeds, the service must return a new IHrmTimeTrackingManager.IAuthorized payload containing newly issued tokens and any updated authorization metadata required by the platform.
   *
   * Implementation may either rotate the refresh token in place or issue a new token pair under platform policy, but it must keep the session model consistent with hrm_time_tracking_manager_sessions and must reject refresh attempts tied to nonexistent, expired, or otherwise invalid sessions. If rotation requires updating or replacing session metadata, that work must be persisted atomically. The flow must not require the manager to re-submit email and password, and it must return clear authentication errors for invalid or expired refresh credentials.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post("refresh")
  public async refresh(
    @TypedBody()
    body: IHrmTimeTrackingManager.IRefresh,
  ): Promise<IHrmTimeTrackingManager.IAuthorized> {
    try {
      return await postHrmTimeTrackingAuthManagerRefresh({
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
