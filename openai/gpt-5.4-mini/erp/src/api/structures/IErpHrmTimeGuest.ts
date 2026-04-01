import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IErpHrmTimeGuest {
  /**
   * Authorization response returned after a successful guest join or guest session refresh. It contains the temporary guest identity and the issued authorization token bundle used for subsequent authenticated requests.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated guest identity.
     *
     * @x-autobe-specification Return the authenticated guest identity identifier generated or resolved by the guest join/refresh workflow. This value is not read directly from a database table in this DTO context; it is emitted as part of the computed authorization response payload and identifies the guest subject for subsequent requests.
     */
    id: string & tags.Format<"uuid">;

    /**
     * Authorization token.
     *
     * @x-autobe-specification Authorization token comes from the session table.
     */
    token: IAuthorizationToken;
  };

  /**
   * Request body for renewing a guest session without adding any client-owned fields to the payload.
   */
  export type IRefresh = {};

  /**
   * Request payload used to complete a guest join flow and establish temporary guest access. It includes the guest’s email, optional join credential, optional invitation code, and request context needed to authorize the temporary session.
   */
  export type IJoin = {
    /**
     * The request URL that initiated the guest join flow.
     *
     * @x-autobe-specification Use the incoming request URL as the guest join source context for authentication handling. This is request metadata, not persisted in erp_hrm_time_guests; downstream auth logic may use it for audit, validation, or redirection decisions.
     */
    href: string & tags.Format<"uri">;

    /**
     * The referring page or URL that led to the guest join request.
     *
     * @x-autobe-specification Use the HTTP referrer header as request context for guest join validation and session attribution. This is transient authentication metadata and is not stored directly on the guest record.
     */
    referrer: string & tags.Format<"uri">;

    /**
     * The client IP address associated with the guest join request, if available.
     *
     * @x-autobe-specification Capture the client IP from request context when available, or accept a client-supplied fallback when the server cannot infer it. This is transient authentication metadata for guest join/session handling, not persisted on the guest record.
     */
    ip?: (string & tags.Format<"ipv4">) | null | undefined;

    /**
     * The email address used to identify the guest during the join flow.
     *
     * @x-autobe-specification Use the provided email address as the guest identity claim for validating temporary access and resolving or creating the corresponding guest session flow. The email is required input to the join process and is not stored as a direct column on erp_hrm_time_guests.
     */
    email: string & tags.Format<"email">;

    /**
     * An optional one-time token used to validate the guest join request.
     *
     * @x-autobe-specification If present, treat this as the one-time guest join or invite token used to validate eligibility for temporary access. The token is consumed by authentication logic and must not be persisted on the guest record.
     */
    token?: string | undefined;

    /**
     * An optional invitation code that links the request to a pending guest invitation.
     *
     * @x-autobe-specification If present, use this invitation code to resolve an invited guest join path or pending invitation context. It is an authentication input only and is not stored directly on the guest record.
     */
    invitationCode?: string | undefined;
  };
}
