import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformGuest } from "../../../structures/ICommunityPlatformGuest";
import { IPageICommunityPlatformGuest } from "../../../structures/IPageICommunityPlatformGuest";

/**
 * Retrieve a filtered and paginated list of guest identity records maintained by the community platform.
 *
 * This operation browses records from the community_platform_guests actor table, which stores the stable anonymous identity anchor used to recognize the same unauthenticated visitor across guest sessions without credential-based login. The returned list is intended for privileged platform operations that need visibility into guest identity lifecycle metadata such as creation time, update time, retirement state, and the globally unique guest_key value associated with each guest actor record.
 *
 * The endpoint is not a public browsing feature for guests themselves. Requirement analysis defines a guest as an unauthenticated visitor who can access only public platform content and who has no personal subscription list, no personal karma score, and no moderation or account-management authority. Because of that boundary, this operation should be exposed only to administrative or otherwise privileged internal actors that are allowed to inspect system-maintained guest identity records.
 *
 * The operation corresponds specifically to the community_platform_guests table and should be documented in terms consistent with that schema. The table represents temporary guest identity records for unauthenticated visitors who browse public areas of the platform without creating a registered account. It stores raw guest identity and lifecycle metadata only. Session connection details, expiry control, and logout behavior do not belong to this operation because those concerns are delegated to the dedicated guest session table rather than this parent actor record.
 *
 * Clients should use this endpoint when they need structured filtering, pagination, and sorting across guest records rather than a simple unfiltered fetch. Typical use includes narrowing results by guest key, lifecycle state inferred from deleted_at presence, or time-based windows using created_at or updated_at. Related session-oriented analysis or logout handling must use the corresponding guest-session operations instead of overloading this endpoint.
 *
 * If supplied filter criteria are invalid, pagination values are out of range, or the caller lacks the necessary privileged access, the request should be rejected according to the platform's general authorization and validation rules. Successful responses return a paginated summary collection optimized for list browsing rather than a session-level or credential-level representation.
 *
 * @param props.connection
 * @param props.body Search criteria, pagination, and sorting options for guest identities
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement this operation as a paginated search over the community_platform_guests table.
 *
 * Accept an ICommunityPlatformGuest.IRequest body containing list retrieval controls such as pagination, sorting, and optional filters. The implementation should support exact or partial matching on guest_key where the DTO defines it, optional filtering by lifecycle timestamps using created_at and updated_at, and filtering by active-versus-retired status using whether deleted_at is null. Only fields that actually exist on community_platform_guests may be queried directly.
 *
 * Construct a database query against community_platform_guests only. Do not join guest session data by default, because the guest actor schema explicitly separates session connection details and expiry control into the dedicated guest session table. If later business requirements need session-aware browsing, that should be introduced through a separate endpoint or an explicitly extended response contract.
 *
 * Apply deterministic ordering so paginated results are stable across repeated requests. Prefer a caller-provided sort option when available in the request DTO; otherwise default to a descending created_at order with a secondary stable tie-breaker such as id. Enforce request validation before query execution, including allowable page size, supported sort fields, and supported filter fields.
 *
 * Authorize the caller before running the query. Reject guest callers and ordinary member-facing self-service use because requirement analysis limits guests to public content viewing and does not define management access to guest actor records. This endpoint should be treated as a privileged administrative or internal inspection operation.
 *
 * Return a paginated response of type IPageICommunityPlatformGuest.ISummary. Each list item should expose summary-safe guest identity metadata appropriate for browsing, based on the guest entity DTO design, and should avoid introducing session-only attributes that belong to guest sessions rather than guest actors.
 * @path /communityPlatform/guests
 * @accessor api.functional.communityPlatform.guests.index
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
     * Search criteria, pagination, and sorting options for guest identities
     */
    body: ICommunityPlatformGuest.IRequest;
  };
  export type Body = ICommunityPlatformGuest.IRequest;
  export type Response = IPageICommunityPlatformGuest.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/guests",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/guests";
  export const random = (): IPageICommunityPlatformGuest.ISummary =>
    typia.random<IPageICommunityPlatformGuest.ISummary>();
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
 * Retrieve a single temporary guest identity record by its unique identifier.
 *
 * This operation returns the detailed guest actor record from the community platform's guest identity domain. The underlying entity, community_platform_guests, is defined as a temporary guest identity record for an unauthenticated visitor who browses public areas of the platform without creating a registered account. It is an internal actor-facing resource that represents browsing continuity for anonymous usage, rather than a public-facing profile or member-owned account object.
 *
 * Access to this operation should be limited to privileged administrative tooling or internal operational use. The requirements define a guest as an unauthenticated visitor with access only to public content, and they do not describe any self-service capability for a guest to inspect or manage stored guest identity records. Likewise, members do not hold platform-wide authority over other identities. For that reason, this endpoint should not be exposed as a public discovery feature and should be treated as an administrative read of internal actor state.
 *
 * The operation is related to guest browsing continuity and may be used together with session-oriented internal features when diagnosing anonymous access behavior, abuse controls, or operational issues involving unauthenticated usage. It is not a substitute for public community, post, comment, or profile viewing endpoints. Callers must provide a valid guest identifier that corresponds to an existing guest record. If the target guest record does not exist, the operation shall fail with a not-found result.
 *
 * Because the entity is temporary in nature, consumers should not assume that a guest record has the same lifecycle, ownership model, or public visibility as a member account or profile. The response should reflect the stored guest identity resource only, based on actual schema fields defined for community_platform_guests.
 *
 * @param props.connection
 * @param props.guestId Unique identifier of the target guest record
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor null
 * @x-autobe-specification Implement this operation as a single-record lookup against the community_platform_guests table using the provided guestId as the primary identifier. Validate that guestId is a well-formed UUID before querying. Fetch exactly one guest actor record and map it to the ICommunityPlatformGuest response DTO.
 *
 * Enforce privileged authorization before database access. Guests and members should not be permitted to retrieve arbitrary guest identity records. If the caller lacks administrative or equivalent internal authority, reject the request with a forbidden result. This authorization rule is derived from the requirements stating that guests are unauthenticated public visitors and members do not have platform-wide authority.
 *
 * If no row exists for the given guestId, return a not-found error. Do not create fallback guest records during read operations. Do not expose related session details unless those fields are part of the ICommunityPlatformGuest schema itself. If session information is required separately, it should be handled by dedicated session operations over community_platform_guest_sessions.
 *
 * Keep the query read-only and non-transactional unless surrounding infrastructure requires standard read consistency. Log access through the platform's operational audit facilities if administrative inspection of actor data is audited. Ensure the response serialization includes only fields that actually belong to the guest entity schema and excludes computed or imagined properties.
 * @path /communityPlatform/guests/:guestId
 * @accessor api.functional.communityPlatform.guests.at
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
     * Unique identifier of the target guest record
     */
    guestId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformGuest;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/guests/:guestId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/guests/${encodeURIComponent(props.guestId ?? "null")}`;
  export const random = (): ICommunityPlatformGuest =>
    typia.random<ICommunityPlatformGuest>();
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
      assert.param("guestId")(() => typia.assert(props.guestId));
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
