import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformGuestSession } from "../../../structures/ICommunityPlatformGuestSession";
import { IPageICommunityPlatformGuestSession } from "../../../structures/IPageICommunityPlatformGuestSession";

/**
 * Retrieve a filtered and paginated list of guest browsing session records.
 *
 * This operation provides administrative visibility into temporary guest identity sessions that support unauthenticated browsing continuity across public areas of the platform. The underlying community_platform_guest_sessions table stores connection context and expiration metadata for each guest access session, including the IP address from which the session was created or last refreshed, the application URL associated with the session creation context, the referrer URL reported when the session was established, the record creation timestamp, and the timestamp when the guest session becomes invalid. The operation is intended for operational inspection, auditing, and support workflows rather than for public-facing use.
 *
 * The returned data is centered on session records that belong to community_platform_guests. The related guest table acts as a stable anonymous identity anchor and contains the guest_key that recognizes the same unauthenticated visitor across one or more guest sessions over time without credential-based login. When useful for filtering or summary presentation, the session list may be enriched with joined guest identity context so administrators can distinguish multiple sessions associated with the same anonymous guest while still respecting that these are non-member identities.
 *
 * Access to this endpoint must be restricted to privileged administrative actors. Requirement analysis states that guests are limited to viewing public content and do not have authority over identity-bound or governance-dependent features. Member sessions represent authenticated account holders for member-only actions, while guest sessions exist specifically for unauthenticated visitors. Because this endpoint exposes operational metadata such as IP, href, and referrer, it must not be available to guests or ordinary members.
 *
 * Clients should use this endpoint when they need to browse guest access activity with pagination, filtering, and sorting. Typical use cases include locating sessions for a known guest identity, reviewing recently created guest sessions, finding sessions that have already expired or are near expiration, and tracing browsing entry points through href or referrer values. If detailed inspection of a single guest session is needed, that should be handled by a separate single-resource retrieval operation rather than by overloading this collection search endpoint.
 *
 * The operation should validate request criteria, apply stable ordering, and return a paginated result optimized for list screens and administration tools. If filters reference unsupported fields or invalid value formats, the request should be rejected according to general business error handling rules. Successful responses should include only the summary fields necessary for browsing and selection of guest session records in an administrative interface.
 *
 * @param props.connection
 * @param props.body Search criteria, pagination, and sorting options for guest sessions
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement this operation as a paginated search over the community_platform_guest_sessions table.
 *
 * Accept an ICommunityPlatformGuestSession.IRequest body containing pagination inputs, sorting options, and optional filters. Supported filters should be based strictly on known schema fields: id, community_platform_guest_id, ip, href, referrer, created_at, and expired_at. The service may also support joined filtering by the related community_platform_guests.guest_key because each session belongs to a guest identity through community_platform_guest_id. Do not infer or filter on fields that are not defined in the loaded schemas.
 *
 * Build a query from community_platform_guest_sessions as the primary source. Join community_platform_guests when guest-level search or summary projection is requested. Apply deterministic ordering, defaulting to created_at descending and id descending as a tiebreaker so pagination remains stable. Return a paginated container typed as IPageICommunityPlatformGuestSession.ISummary.
 *
 * Before executing the query, enforce authorization so only administrative actors can access the operation. Reject guests because requirements limit them to public content only. Reject ordinary members because guest session connection metadata is operational data, not a member feature. If the platform has an admin authentication mechanism, require a valid admin session before query execution.
 *
 * Validate filter value formats before querying. UUID-shaped filters such as id or community_platform_guest_id must be validated as UUID strings. Date or timestamp range filters must be validated for coherent bounds. String search filters on ip, href, referrer, or guest_key should use safe partial matching or exact matching according to DTO design, with escaping to prevent malformed pattern expressions. Ignore no filters silently only when the request body explicitly permits empty searches; otherwise, treat structurally invalid criteria as a client error.
 *
 * Project summary-oriented fields in the response. At minimum, include identifiers and core session metadata used in list views: session id, guest identity linkage, connection context, created timestamp, and expiration timestamp. When joined guest information is included, ensure it comes only from existing fields such as guest_key and avoid exposing internal data not needed by the administrative list screen.
 *
 * The operation is read-only and must not create, refresh, invalidate, or delete guest sessions. Transactional write handling is unnecessary unless the implementation also records an access audit event in a separate internal subsystem. Error handling should cover unauthorized access, malformed search criteria, and unexpected persistence failures with consistent platform-standard error responses.
 * @path /communityPlatform/guestSessions
 * @accessor api.functional.communityPlatform.guestSessions.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Search criteria, pagination, and sorting options for guest sessions
     */
    body: ICommunityPlatformGuestSession.IRequest;
  };
  export type Body = ICommunityPlatformGuestSession.IRequest;
  export type Response = IPageICommunityPlatformGuestSession.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/guestSessions",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/guestSessions";
  export const random = (): IPageICommunityPlatformGuestSession.ISummary =>
    typia.random<IPageICommunityPlatformGuestSession.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
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

/**
 * Retrieve a single guest session record for an unauthenticated visitor by its unique identifier.
 *
 * This operation returns the temporary guest access session stored in `community_platform_guest_sessions`, the table described as holding session records for temporary guest identities used to maintain unauthenticated browsing continuity. The returned resource represents connection context and expiration metadata for a guest-level session, including the guest identity linkage, origin context such as IP address and URLs, and the time boundary after which the session is no longer valid. It is intended for flows that need to resolve an existing guest browsing context and determine whether that context can still be recognized by the platform.
 *
 * From an authorization perspective, this operation relates to the guest actor boundary rather than the authenticated member boundary. The requirements state that a guest is an unauthenticated visitor who can browse public platform content and that a guest must not be treated as having a member session. Accordingly, this endpoint does not establish member access or expose member-only capabilities. Instead, it supports the platform's handling of temporary guest identity continuity. Any caller using this operation must treat the returned session strictly as guest-scoped access state and must not infer authenticated account privileges from its existence.
 *
 * The underlying session record belongs to `community_platform_guests`, which is documented as the stable anonymous identity anchor for unauthenticated visitors. The parent guest record intentionally excludes credential fields and keeps only raw guest identity and lifecycle metadata, while the session table stores issuance context, refresh-related metadata, and invalidation timing. This means the operation is centered on resolving a single session record, not on account login, profile ownership, or member personalization. The `guestSessionId` path parameter identifies the exact `community_platform_guest_sessions.id` value and maps to the session record's UUID primary key.
 *
 * Callers should expect this operation to succeed only when the specified session record exists and is readable within the current service rules. If the record does not exist, the service should reject the lookup. If the record exists but its `expired_at` time indicates that it is no longer valid for authorization purposes, the service should still apply the platform's session validity rules when using the returned data. This operation may be used together with guest session creation, refresh, or invalidation flows implemented elsewhere, but it does not itself refresh, extend, or mutate the session.
 *
 * @param props.connection
 * @param props.guestSessionId Unique identifier of the guest session record
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Locate the target record in `community_platform_guest_sessions` by primary key `id` using the `guestSessionId` path parameter.
 *
 * Return a single `ICommunityPlatformGuestSession` object populated from the persisted columns of the session record. The implementation should at minimum map `id`, the foreign key to the belonged guest identity, connection context fields such as `ip`, `href`, and `referrer`, and lifecycle timestamps including `created_at` and `expired_at`. Include the belonged guest relationship only if the referenced DTO structure for `ICommunityPlatformGuestSession` requires it; otherwise avoid unnecessary joins and return the session-focused shape.
 *
 * Validate that `guestSessionId` is a UUID-formatted identifier before querying. If no matching session record exists, raise a not-found error. Do not create, refresh, or mutate any guest or session records in this operation. Do not treat the record as a member session and do not invoke member authentication logic.
 *
 * If downstream service rules depend on session validity, the implementation may additionally compare `expired_at` against the current timestamp to determine whether the located record is still valid for subsequent guest-authorized behavior, but the read operation itself remains a retrieval endpoint. Keep the query side-effect free and ensure that any authorization checks preserve the distinction between guest browsing continuity and authenticated member access.
 * @path /communityPlatform/guestSessions/:guestSessionId
 * @accessor api.functional.communityPlatform.guestSessions.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Unique identifier of the guest session record
     */
    guestSessionId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformGuestSession;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/guestSessions/:guestSessionId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/guestSessions/${encodeURIComponent(props.guestSessionId ?? "null")}`;
  export const random = (): ICommunityPlatformGuestSession =>
    typia.random<ICommunityPlatformGuestSession>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("guestSessionId")(() => typia.assert(props.guestSessionId));
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
