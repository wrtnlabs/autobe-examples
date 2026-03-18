import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace IMultiUserTodoGuest {
  /**
   * Guest registration request payload used to create (or identify) a guest identity by device fingerprint. The client provides a device-generated fingerprint; the server uses it to create/reuse the guest actor and then issues guest-scoped authorization tokens (returned by the endpoint, not by this DTO).
   */
  export type IJoin = {
    /**
     * Client-generated device fingerprint used to correlate the guest identity across requests while the user remains unauthenticated.
     *
     * @x-autobe-database-schema-property device_fingerprint
     * @x-autobe-specification Direct mapping from multi_user_todo_guests.device_fingerprint. Store exactly the provided client fingerprint string and use it to locate an existing guest actor (DB unique constraint on device_fingerprint) or create a new one according to join semantics.
     */
    deviceFingerprint: string & tags.MinLength<1>;
  };

  /**
   * Guest authentication result payload returned after a guest account join or after renewing an existing guest session. It provides the guest actor identifier and the JWT token set the client must use for subsequent protected requests.
   */
  export type IAuthorized = {
    /**
     * Guest actor identifier (primary key) for the currently authorized guest.
     *
     * @x-autobe-specification Return the authenticated guest actor primary key from the guest actor identity that was created or validated during the request. Implementation should resolve it from the guest actor record associated with the current guest session (multi_user_todo_guest_guests) or the created guest account.
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
   * Payload used by a guest to renew authentication tokens by presenting the previously issued refresh token.
   */
  export type IRefresh = {
    /**
     * Previously issued refresh token used by a guest to request a new authorization token set.
     *
     * @x-autobe-specification Client provides refreshToken as plaintext string. Backend looks up matching guest session by this refresh token, verifies it is active/valid, then issues renewed authorization tokens.
     */
    refreshToken: null;
  };

  /**
   * Request body for browsing the authenticated member’s todo list. Lets the client select pagination (page/limit), an optional completion-status filter (all/complete/incomplete), and sorting preferences (which date field to sort by and ascending/descending order).
   */
  export type IRequest = {
    /**
     * 1-indexed page number to return (must be >= 1).
     *
     * @x-autobe-specification Parse as a positive integer (page >= 1). Use it to select the page of results after filtering and sorting. For page-based pagination, compute offset = (page - 1) * limit.
     */
    page?: (number & tags.Type<"int32"> & tags.Minimum<1>) | undefined;

    /**
     * Maximum number of todos to include in the returned page (1..100).
     *
     * @x-autobe-specification Parse as an integer with bounds 1..100 (inclusive as constrained by schema). Use it as the maximum number of items to return for the requested page.
     */
    limit?:
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined;

    /**
     * Completion-status filter applied to the member’s todos: 'all', 'complete', or 'incomplete'.
     *
     * @x-autobe-specification Validate completionStatus is one of 'all' | 'complete' | 'incomplete'. Apply: 'all' => no completion filter; 'complete' => include only todos with completed=true; 'incomplete' => include only todos with completed=false, within the acting member’s private dataset.
     */
    completionStatus?: "all" | "complete" | "incomplete" | undefined;

    /**
     * Which timestamp field to sort the todo list by: createdAt, startDate, or dueDate.
     *
     * @x-autobe-specification Validate sortBy is one of 'createdAt' | 'startDate' | 'dueDate'. Apply ordering based on the selected key: 'createdAt' => order by todo creation timestamp; 'startDate' => order by start date value; 'dueDate' => order by due date value.
     */
    sortBy?: "createdAt" | "startDate" | "dueDate" | undefined;

    /**
     * Sort direction: 'asc' for ascending or 'desc' for descending. For startDate/dueDate, missing (null) dates are always placed last.
     *
     * @x-autobe-specification Validate sortOrder is one of 'asc' | 'desc'. Apply it as the direction for the chosen sortBy key. When sortBy is 'startDate' or 'dueDate', treat null/missing selected date values as 'missing' and always sort them to the end regardless of sortOrder; non-missing values follow the requested asc/desc direction.
     */
    sortOrder?: "asc" | "desc" | undefined;
  };
}
